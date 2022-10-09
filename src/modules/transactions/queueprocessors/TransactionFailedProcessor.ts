import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus, TransactionQueueName } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { MessageProcessor } from "./message.processor";
import { SqsClient } from "./sqs.client";
import { TransactionService } from "../transaction.service";
import { LockService } from "../../../modules/common/lock.service";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { NotificationEventType } from "../../../modules/notifications/domain/NotificationTypes";

export class TransactionFailedProcessor extends MessageProcessor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
    private readonly notificationService: NotificationService,
    lockService: LockService,
  ) {
    super(
      logger,
      transactionRepo,
      sqsClient,
      consumerService,
      transactionService,
      TransactionQueueName.TransactionFailed,
      lockService,
    );
  }

  async processMessageInternal(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (
      status != TransactionStatus.FIAT_INCOMING_REVERSAL_FAILED &&
      status != TransactionStatus.FIAT_INCOMING_FAILED &&
      status != TransactionStatus.CRYPTO_OUTGOING_FAILED &&
      status != TransactionStatus.VALIDATION_FAILED
    ) {
      this.logger.info(`${transactionId}: Transaction is not in the correct status, skipping, status: ${status}`);
      return;
    }
    const consumer = await this.consumerService.getConsumer(transaction.props.userId);
    const paymentMethod = consumer.getPaymentMethodByID(transaction.props.paymentMethodID);
    if (paymentMethod == null) {
      // Should never happen if we got this far
      this.logger.error(
        `${transactionId}: Unknown payment method "${paymentMethod}" for consumer ${consumer.props._id}`,
      );
      return;
    }

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: TransactionStatus.FAILED,
      }),
    );

    // Get latest error
    let errorMessage: string;
    if (transaction.props.transactionExceptions.length == 0) {
      // Should ALWAYS be, but if it's not, populate a generic error message
      switch (status) {
        case TransactionStatus.FIAT_INCOMING_FAILED:
          errorMessage = "Unable to complete credit card charge.";
          break;
        case TransactionStatus.CRYPTO_OUTGOING_FAILED:
          errorMessage = "Unable to complete crypto transaction.";
          break;
        case TransactionStatus.VALIDATION_FAILED:
          errorMessage = "Failed to validate transaction parameters.";
          break;
        case TransactionStatus.FIAT_INCOMING_REVERSAL_FAILED:
          errorMessage = "Failed to reverse credit card charge.";
          break;
        default:
          errorMessage = "Failed to complete transaction.";
          this.logger.error(`${transactionId}: Unknown status in TransactionFailedProcessor: ${status}`);
      }
    } else {
      errorMessage =
        transaction.props.transactionExceptions[transaction.props.transactionExceptions.length - 1].message;
    }

    await this.notificationService.sendNotification(
      NotificationEventType.SEND_ORDER_FAILED_EVENT,
      transaction.props.partnerID,
      {
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        email: consumer.props.displayEmail,
        orderFailedParams: {
          transactionID: transaction.props._id,
          transactionTimestamp: transaction.props.transactionTimestamp,
          paymentMethod: paymentMethod.cardType,
          last4Digits: paymentMethod.last4Digits,
          currencyCode: transaction.props.leg1,
          conversionRate: transaction.props.exchangeRate,
          processingFee: transaction.props.processingFee,
          networkFee: transaction.props.networkFee,
          nobaFee: transaction.props.nobaFee,
          totalPrice: transaction.props.leg1Amount,
          cryptoAmount: transaction.props.leg2Amount,
          cryptoCurrency: transaction.props.leg2, // This will be the final settled amount; may differ from original
          failureReason: errorMessage,
        },
      },
    );
  }
}
