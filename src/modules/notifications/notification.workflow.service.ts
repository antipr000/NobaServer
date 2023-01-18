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

    switch (notificationWorkflowType) {
      case NotificationWorkflowTypes.TRANSACTION_COMPLETED_EVENT:
        const orderSuccessPayload =
          this.transactionNotificationPayloadMapper.toTransactionExecutedNotificationParameters(transaction);
        if (transaction.debitConsumerID) {
          const consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
          const payload: NotificationPayload = prepareNotificationPayload(consumer, {
            transactionExecutedParams: orderSuccessPayload,
          });
          await this.notificationService.sendNotification(
            NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT,
            payload,
          );
        }

        if (transaction.creditConsumerID) {
          const consumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
          const payload: NotificationPayload = prepareNotificationPayload(consumer, {
            transactionExecutedParams: orderSuccessPayload,
          });
          await this.notificationService.sendNotification(
            NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT,
            payload,
          );
        }
        break;
      case NotificationWorkflowTypes.TRANSACTION_FAILED_EVENT:
        const orderFailedPayload =
          this.transactionNotificationPayloadMapper.toTransactionFailedNotificationParameters(transaction);
        if (transaction.debitConsumerID) {
          const consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
          const payload: NotificationPayload = prepareNotificationPayload(consumer, {
            transactionFailedParams: orderFailedPayload,
          });
          await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSACTION_FAILED_EVENT, payload);
        } else {
          const consumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
          const payload: NotificationPayload = prepareNotificationPayload(consumer, {
            transactionFailedParams: orderFailedPayload,
          });
          await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSACTION_FAILED_EVENT, payload);
        }
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
}