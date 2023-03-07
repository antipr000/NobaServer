import { Inject, Injectable } from "@nestjs/common";
import { NotificationEventType, NotificationWorkflowTypes } from "./domain/NotificationTypes";
import { ConsumerService } from "../consumer/consumer.service";
import { TransactionService } from "../transaction/transaction.service";
import { NotificationService } from "./notification.service";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotificationPayload, prepareNotificationPayload } from "./domain/NotificationPayload";
import { TransactionNotificationPayloadMapper } from "./domain/TransactionNotificationParameters";
import { Transaction } from "../transaction/domain/Transaction";
import { Consumer } from "../consumer/domain/Consumer";
import { PayrollStatus } from "../employer/domain/Payroll";
import { EmployerService } from "../employer/employer.service";

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

  @Inject()
  private readonly employerService: EmployerService;

  private readonly transactionNotificationPayloadMapper: TransactionNotificationPayloadMapper;
  constructor() {
    this.transactionNotificationPayloadMapper = new TransactionNotificationPayloadMapper();
  }

  async sendTransactionNotification(
    notificationWorkflowType: NotificationWorkflowTypes,
    transactionID: string,
  ): Promise<void> {
    if (!transactionID) {
      this.logger.error("Failed to send notification from workflow. Reason: Transaction ID is required");
      throw new ServiceException({
        message: "Transaction ID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

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

    const transactionPayload = await this.generateTransactionPayload(transaction, notificationWorkflowType);
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
        const creditConsumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
        const transferReceivedPayload =
          this.transactionNotificationPayloadMapper.toTransferReceivedNotificationParameters(
            transaction,
            consumer,
            creditConsumer,
          );
        payload = prepareNotificationPayload(creditConsumer, {
          transferReceivedParams: transferReceivedPayload,
        });
        await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.TRANSFER_FAILED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        payload = prepareNotificationPayload(consumer, {
          transferFailedParams: transactionPayload,
        });
        await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_FAILED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.COLLECTION_COMPLETED_EVENT:
        // No need to send email for now as we are already sending deposit completed email
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

  async sendPayrollStatusUpdateNotification(payrollID: string, status: PayrollStatus) {
    if (!payrollID) {
      this.logger.error("Failed to send notification from workflow. Reason: Payroll ID is required");
      throw new ServiceException({
        message: "Payroll ID is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    if (!status) {
      this.logger.error("Failed to send notification from workflow. Reason: Payroll status is required");
      throw new ServiceException({
        message: "Payroll status is required",
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    const payroll = await this.employerService.getPayrollByID(payrollID);

    if (!payroll) {
      this.logger.error(`Failed to send notification from workflow. Reason: Payroll with id ${payrollID} not found`);
      throw new ServiceException({
        message: `Payroll with id ${payrollID} not found`,
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      });
    }

    await this.notificationService.sendNotification(NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT, {
      nobaPayrollID: payrollID,
      payrollStatus: status,
    });
  }

  private async generateTransactionPayload(
    transaction: Transaction,
    notificationType: NotificationWorkflowTypes,
  ): Promise<any> {
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
        const creditConsumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
        const debitConsumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        return this.transactionNotificationPayloadMapper.toTransferCompletedNotificationParameters(
          transaction,
          debitConsumer,
          creditConsumer,
        );
      case NotificationWorkflowTypes.TRANSFER_FAILED_EVENT:
        const creditConsumerFailed = await this.consumerService.getConsumer(transaction.creditConsumerID);
        const debitConsumerFailed = await this.consumerService.getConsumer(transaction.debitConsumerID);
        return this.transactionNotificationPayloadMapper.toTransferFailedNotificationParameters(
          transaction,
          creditConsumerFailed,
          debitConsumerFailed,
        );
      default:
        return null;
    }
  }
}
