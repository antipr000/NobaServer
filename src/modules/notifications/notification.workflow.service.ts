import { Inject, Injectable } from "@nestjs/common";
import { NotificationEventType, NotificationWorkflowTypes } from "./domain/NotificationTypes";
import { ConsumerService } from "../consumer/consumer.service";
import { TransactionService } from "../transaction/transaction.service";
import { NotificationService } from "./notification.service";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotificationPayload, prepareNotificationPayload } from "./domain/NotificationPayload";
import { TransactionNotificationPayloadMapper } from "./domain/TransactionNotificationParameters";
import { Transaction } from "../transaction/domain/Transaction";
import { Consumer } from "../consumer/domain/Consumer";

@Injectable()
export class NotificationWorkflowService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly consumerService: ConsumerService;

  @Inject()
  private readonly transactionService: TransactionService;

  @Inject()
  private readonly notificationService: NotificationService;

  private readonly transactionNotificationPayloadMapper: TransactionNotificationPayloadMapper;
  constructor() {
    this.transactionNotificationPayloadMapper = new TransactionNotificationPayloadMapper();
  }

  async sendNotification(notificationWorkflowType: NotificationWorkflowTypes, transactionID: string): Promise<void> {
    const transaction = await this.transactionService.getTransactionByTransactionID(transactionID);
    if (!transaction) {
      this.logger.error(
        `Failed to send notification from workflow. Reason: Transaction with id ${transactionID} not found`,
      );
      throw new ServiceException({
        message: `Transaction with id ${transactionID} not found`,
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    let consumer: Consumer;
    let payload: NotificationPayload;

    const transactionPayload = this.generateTransactionPayload(transaction, notificationWorkflowType);
    switch (notificationWorkflowType) {
      case NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        payload = prepareNotificationPayload(consumer, {
          depositCompletedParams: transactionPayload,
        });
        await this.notificationService.sendNotification(NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.DEPOSIT_FAILED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        payload = prepareNotificationPayload(consumer, {
          depositFailedParams: transactionPayload,
        });
        await this.notificationService.sendNotification(NotificationEventType.SEND_DEPOSIT_FAILED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.WITHDRAWAL_COMPLETED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        payload = prepareNotificationPayload(consumer, {
          withdrawalCompletedParams: transactionPayload,
        });
        await this.notificationService.sendNotification(NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.WITHDRAWAL_FAILED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        payload = prepareNotificationPayload(consumer, {
          withdrawalFailedParams: transactionPayload,
        });
        await this.notificationService.sendNotification(NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.TRANSFER_COMPLETED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        payload = prepareNotificationPayload(consumer, {
          transferCompletedParams: transactionPayload,
        });
        await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT, payload);

        consumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
        payload = prepareNotificationPayload(consumer, {
          transferCompletedParams: transactionPayload,
        });
        await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.COLLECTION_COMPLETED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        payload = prepareNotificationPayload(consumer, {});
        await this.notificationService.sendNotification(NotificationEventType.SEND_COLLECTION_COMPLETED_EVENT, payload);
        break;
      default:
        this.logger.error(
          `Failed to send notification from workflow. Reason: ${notificationWorkflowType} is not supported!`,
        );
        throw new ServiceException({
          message: "Invalid workflow type",
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        });
    }
  }

  private generateTransactionPayload(transaction: Transaction, notificationType: NotificationWorkflowTypes): any {
    switch (notificationType) {
      case NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT:
        return this.transactionNotificationPayloadMapper.toDepositCompletedNotificationParameters(transaction);
      case NotificationWorkflowTypes.DEPOSIT_FAILED_EVENT:
        return this.transactionNotificationPayloadMapper.toDepositFailedNotificationParameters(transaction);
      case NotificationWorkflowTypes.WITHDRAWAL_COMPLETED_EVENT:
        return this.transactionNotificationPayloadMapper.toWithdrawalCompletedNotificationParameters(transaction);
      case NotificationWorkflowTypes.WITHDRAWAL_FAILED_EVENT:
        return this.transactionNotificationPayloadMapper.toWithdrawalFailedNotificationParameters(transaction);
      case NotificationWorkflowTypes.TRANSFER_COMPLETED_EVENT:
        return this.transactionNotificationPayloadMapper.toTransferCompletedNotificationParameters(transaction);
      default:
        return null;
    }
  }
}
