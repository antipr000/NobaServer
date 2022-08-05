import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Transaction } from "../domain/Transaction";
import { TransactionQueueName, TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { CheckoutValidationError, CHECKOUT_VALIDATION_ERROR_HTTP_CODE } from "../domain/CheckoutConstants";
import { VerificationService } from "../../../modules/verification/verification.service";
import { TransactionService } from "../transaction.service";
import { SqsClient } from "./sqs.client";
import { MessageProcessor } from "./message.processor";
import { PaymentRequestResponse } from "../../../modules/consumer/domain/Types";
import { PaymentMethodStatus } from "../../../modules/consumer/domain/VerificationStatus";
import { Consumer } from "../../../modules/consumer/domain/Consumer";

export class FiatTransactionInitiator extends MessageProcessor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
    private readonly verificationService: VerificationService,
  ) {
    super(
      logger,
      transactionRepo,
      sqsClient,
      consumerService,
      transactionService,
      TransactionQueueName.FiatTransactionInitiator,
    );
  }

  async processMessage(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.VALIDATION_PASSED && status != TransactionStatus.FIAT_INCOMING_INITIATING) {
      this.logger.info(`Transaction ${transactionId} is not in validate passed state, skipping, status: ${status}`);
      return;
    }

    // If status is already TransactionStatus.FIAT_INCOMING_INITIATING, then we failed this step before. Query checkout to see if our call
    // succeeded and if so, skip checkout and continue with updating transaction status & enqueueing.
    if (status == TransactionStatus.FIAT_INCOMING_INITIATING) {
      // TDOO(#310): query checkout based on transaction.props._id to see if we already have a payment id
    } else {
      //before initiating the transaction we want to update the status so that if the initiator fails we don't execute this block again and manually resolve the failure depending on the type
      transaction = await this.transactionRepo.updateTransaction(
        Transaction.createTransaction({
          ...transaction.props,
          transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATING,
        }),
      );
    }

    let consumer = await this.consumerService.getConsumer(transaction.props.userId);

    // TODO(#): What is this variable doing here?
    // [JA] - See comment above for if status is FIAT_INCOMING_INITIATING - that explains why we would want it this early
    let checkoutPaymentID: string;
    // TODO(#310) This is happening before we've called the ZH logic to calculate the true fiat value! We need to call
    // ZH before we even get here!
    if (checkoutPaymentID == undefined) {
      // Fiat Transaction implementation here
      let paymentResponse: PaymentRequestResponse;
      try {
        paymentResponse = await this.consumerService.requestCheckoutPayment(consumer, transaction);
        if (
          paymentResponse.status === PaymentMethodStatus.REJECTED ||
          paymentResponse.status === PaymentMethodStatus.FLAGGED
        ) {
          this.handleCheckoutFailure(
            paymentResponse.responseCode,
            paymentResponse.responseSummary,
            paymentResponse.status,
            consumer,
            transaction,
          );
        }
      } catch (e) {
        if (e.http_code === CHECKOUT_VALIDATION_ERROR_HTTP_CODE) {
          const errorBody: CheckoutValidationError = e.body;
          const errorDescription = errorBody.error_type;
          const errorCode = errorBody.error_codes.join(",");

          this.handleCheckoutFailure(errorCode, errorDescription, PaymentMethodStatus.REJECTED, consumer, transaction);

          return;
        } else {
          this.logger.error(`Fiat payment failed: ${JSON.stringify(e)}`);

          // TODO: What more to do here?
          await this.processFailure(
            TransactionStatus.FIAT_INCOMING_FAILED,
            `Error from Checkout: ${JSON.stringify(e)}`,
            transaction,
          );
        }
        return;
      }

      checkoutPaymentID = paymentResponse.paymentID;
    }

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        checkoutPaymentID: checkoutPaymentID,
      }),
    );

    //Move to initiated queue, db poller will take delay to put it to queue as it's scheduled so we move it to the target queue directly from here
    await this.sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transactionId);
  }

  async handleCheckoutFailure(
    errorCode: string,
    errorDescription: string,
    status: PaymentMethodStatus,
    consumer: Consumer,
    transaction: Transaction,
  ) {
    this.logger.error(`Fiat payment failed with error code: ${errorCode}, error description: ${errorDescription}`);

    // Send to failure queue
    await this.processFailure(
      TransactionStatus.FIAT_INCOMING_FAILED,
      `${errorCode} - ${errorDescription}`,
      transaction,
    );

    const paymentMethod = (
      await this.consumerService.getConsumer(transaction.props.userId)
    ).props.paymentMethods.filter(
      currPaymentMethod => currPaymentMethod.paymentToken === transaction.props.paymentMethodID,
    )[0];

    this.consumerService.updatePaymentMethod(consumer.props._id, {
      ...paymentMethod,
      status: status,
      authCode: errorCode,
      authReason: errorDescription,
    });

    // Inform Sardine
    await this.verificationService.provideTransactionFeedback(
      errorCode,
      errorDescription,
      transaction.props._id,
      paymentMethod.paymentProviderID,
    );
  }
}
