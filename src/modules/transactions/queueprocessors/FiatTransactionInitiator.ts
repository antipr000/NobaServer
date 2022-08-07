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
    if (status !== TransactionStatus.FIAT_INCOMING_INITIATING) {
      //before initiating the transaction we want to update the status so that if the initiator fails we don't execute this block again and manually resolve the failure depending on the type
      transaction = await this.transactionRepo.updateTransaction(
        Transaction.createTransaction({
          ...transaction.props,
          transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATING,
        }),
      );
    } else {
      // Will check below whether we already have a checkoutPaymentID and if so, skip the rest of the logic.
    }

    let consumer = await this.consumerService.getConsumer(transaction.props.userId);
    let checkoutPaymentID: string = transaction.props.checkoutPaymentID;
    // TODO(#310) This is happening before we've called the ZH logic to calculate the true fiat value! We need to call
    // ZH before we even get here!
    if (checkoutPaymentID !== undefined && checkoutPaymentID !== null) {
      this.logger.error(
        `Got into FiatTransctionInitiator with an existing checkoutPaymentID: ${checkoutPaymentID} for transaction: ${transaction.props._id}. Moving to next queue...`,
      );
      await this.sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transactionId);
    } else {
      // Fiat Transaction implementation here
      let paymentResponse: PaymentRequestResponse;
      try {
        paymentResponse = await this.consumerService.requestCheckoutPayment(consumer, transaction);
        if (
          paymentResponse.status === PaymentMethodStatus.REJECTED ||
          paymentResponse.status === PaymentMethodStatus.FLAGGED
        ) {
          await this.handleCheckoutFailure(
            paymentResponse.responseCode,
            paymentResponse.responseSummary,
            paymentResponse.status,
            consumer,
            transaction,
            true,
          );
          return;
        } else if (paymentResponse.status === PaymentMethodStatus.APPROVED) {
          checkoutPaymentID = paymentResponse.paymentID;
          transaction = await this.transactionRepo.updateTransaction(
            Transaction.createTransaction({
              ...transaction.props,
              transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
              checkoutPaymentID: checkoutPaymentID,
            }),
          );
          //Move to initiated queue, db poller will take delay to put it to queue as it's scheduled so we move it to the target queue directly from here
          await this.sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transactionId);
          return;
        } else {
          // Should not be any other response
          this.logger.error(
            `Invalid response received from consumerService.requestCheckoutPayment(): ${paymentResponse.status}`,
          );
          return;
        }
      } catch (e) {
        if (e.http_code === CHECKOUT_VALIDATION_ERROR_HTTP_CODE) {
          const errorBody: CheckoutValidationError = e.body;
          const errorDescription = errorBody.error_type;
          const errorCode = errorBody.error_codes.join(",");

          await this.handleCheckoutFailure(
            errorCode,
            errorDescription,
            PaymentMethodStatus.REJECTED,
            consumer,
            transaction,
            false,
          );

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
    }
  }

  async handleCheckoutFailure(
    errorCode: string,
    errorDescription: string,
    status: PaymentMethodStatus,
    consumer: Consumer,
    transaction: Transaction,
    updateSardine: boolean,
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

    if (updateSardine) {
      // Inform Sardine
      await this.verificationService.provideTransactionFeedback(
        errorCode,
        errorDescription,
        transaction.props._id,
        paymentMethod.paymentProviderID,
      );
    }
  }
}
