import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Transaction } from "../domain/Transaction";
import { TransactionQueueName, TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { VerificationService } from "../../../modules/verification/verification.service";
import { TransactionService } from "../transaction.service";
import { SqsClient } from "./sqs.client";
import { MessageProcessor } from "./message.processor";
import { PaymentRequestResponse } from "../../../modules/consumer/domain/Types";
import { PaymentMethodStatus } from "../../../modules/consumer/domain/VerificationStatus";
import { Consumer } from "../../../modules/consumer/domain/Consumer";
import { LockService } from "../../../modules/common/lock.service";
import { CardFailureExceptionText, CardProcessingException } from "../../../modules/consumer/CardProcessingException";

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
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.VALIDATION_PASSED) {
      this.logger.info(`${transactionId}: Transaction is not in validate passed state, skipping, status: ${status}`);
      return;
    }

    const consumer = await this.consumerService.getConsumer(transaction.props.userId);
    try {
      // `requestPayment` is idempotent. So, it is safe to call it multiple times.
      const paymentResponse: PaymentRequestResponse = await this.consumerService.requestPayment(consumer, transaction);

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
        transaction = await this.transactionRepo.updateTransactionStatus(
          transaction.props._id,
          TransactionStatus.FIAT_INCOMING_INITIATED,
          {
            ...transaction.props,
            fiatPaymentInfo: {
              ...transaction.props.fiatPaymentInfo,
              paymentID: paymentResponse.paymentID,
            },
          },
        );
        // Move to initiated queue.
        // DBPoller will take delay to put it to queue as it's scheduled periodically.
        await this.sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transactionId);
        return;
      } else {
        // Should not be any other response
        this.logger.error(
          `${transactionId}: Invalid response received from consumerService.requestPayment(): ${paymentResponse.status}`,
        );

        await this.processFailure(
          TransactionStatus.FIAT_INCOMING_FAILED,
          `Unknown status code: ${paymentResponse.status}`,
          transaction,
        );
        return;
      }
    } catch (e) {
      console.log(e);

      if (e instanceof CardProcessingException) {
        if (e.disposition === CardFailureExceptionText.ERROR) {
          await this.processFailure(
            TransactionStatus.FIAT_INCOMING_FAILED,
            "Error processing fiat transaction",
            transaction,
            e.message,
          );
        } else if (e.disposition === CardFailureExceptionText.SOFT_DECLINE) {
          // Soft declines may work upon retry (e.g. could be caused by breach of credit limit) so we don't want to block the card

          this.logger.info(
            `${transactionId}: Transaction failed fiat leg with code ${e.reasonCode}-${e.reasonSummary}`,
          );

          await this.handleCheckoutFailure(
            e.reasonCode,
            e.reasonSummary,
            PaymentMethodStatus.APPROVED,
            consumer,
            transaction,
            false,
          );
        } else if (e.disposition === CardFailureExceptionText.NO_CRYPTO) {
          this.logger.info(
            `${transactionId}: Transaction failed fiat leg with code ${e.reasonCode}-${e.reasonSummary} as it doesn't support crypto`,
          );

          await this.handleCheckoutFailure(
            e.reasonCode,
            e.reasonSummary,
            PaymentMethodStatus.UNSUPPORTED,
            consumer,
            transaction,
            false,
          );
        } else {
          // All others should have an error code & description
          // that get persisted to the database and updated in Sardine
          this.logger.info(
            `${transactionId}: Transaction failed fiat leg with code ${e.reasonCode}-${e.reasonSummary}`,
          );

          await this.handleCheckoutFailure(
            e.reasonCode,
            e.reasonSummary,
            PaymentMethodStatus.REJECTED,
            consumer,
            transaction,
            true,
          );
        }
      } else {
        await this.processFailure(
          TransactionStatus.FIAT_INCOMING_FAILED,
          "Error processing fiat transaction",
          transaction,
        );
      }
      return;
    }
  }

  private async handleCheckoutFailure(
    errorCode: string,
    errorDescription: string,
    status: PaymentMethodStatus,
    consumer: Consumer,
    transaction: Transaction,
    updateSardine: boolean,
  ) {
    this.logger.error(
      `${transaction.props._id}: Fiat payment failed with error code: ${errorCode}, error description: ${errorDescription}`,
    );

    // Send to failure queue
    await this.processFailure(
      TransactionStatus.FIAT_INCOMING_FAILED,
      `${errorCode} - ${errorDescription}`,
      transaction,
    );

    const paymentMethod = consumer.getPaymentMethodByID(transaction.props.fiatPaymentInfo.paymentMethodID);
    this.consumerService.updatePaymentMethod(consumer.props._id, {
      ...paymentMethod,
      cardData: {
        ...paymentMethod.cardData,
        authCode: errorCode,
        authReason: errorDescription,
      },
      status: status,
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
