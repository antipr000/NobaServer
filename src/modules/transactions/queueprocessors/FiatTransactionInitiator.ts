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
import { LockService } from "../../../modules/common/lock.service";

export class FiatTransactionInitiator extends MessageProcessor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
    lockService: LockService,
    private readonly verificationService: VerificationService,
  ) {
    super(
      logger,
      transactionRepo,
      sqsClient,
      consumerService,
      transactionService,
      TransactionQueueName.FiatTransactionInitiator,
      lockService,
    );
  }

  async processMessageInternal(transactionId: string) {
    const transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.VALIDATION_PASSED) {
      this.logger.info(`Transaction ${transactionId} is not in validate passed state, skipping, status: ${status}`);
      return;
    }

    const consumer = await this.consumerService.getConsumer(transaction.props.userId);
    try {
      // `requestCheckoutPayment` is idempotent. So, it is safe to call it multiple times.
      const paymentResponse: PaymentRequestResponse = await this.consumerService.requestCheckoutPayment(
        consumer,
        transaction,
      );

      if (
        paymentResponse.status === PaymentMethodStatus.REJECTED ||
        paymentResponse.status === PaymentMethodStatus.FLAGGED
      ) {
        return this.handleCheckoutFailure(
          paymentResponse.responseCode,
          paymentResponse.responseSummary,
          paymentResponse.status,
          consumer,
          transaction,
          true,
        );
      } else if (paymentResponse.status === PaymentMethodStatus.APPROVED) {
        await this.transactionRepo.updateTransactionStatus(
          transaction.props._id,
          TransactionStatus.FIAT_INCOMING_INITIATED,
          {
            ...transaction.props,
            checkoutPaymentID: paymentResponse.paymentID,
          },
        );
        // Move to initiated queue.
        // DBPoller will take delay to put it to queue as it's scheduled periodically.
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
        // Will be retried later when DBPoller will poll the transaction.
      }
      return;
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
