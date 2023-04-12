import { Inject, Injectable } from "@nestjs/common";
import { NotificationEventType, NotificationWorkflowTypes } from "./domain/NotificationTypes";
import { ConsumerService } from "../consumer/consumer.service";
import { TransactionService } from "../transaction/transaction.service";
import { NotificationService } from "./notification.service";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotificationPayload, NotificationPayloadMapper } from "./domain/NotificationPayload";
import { TransactionNotificationPayloadMapper } from "./domain/TransactionNotificationParameters";
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
    let creditConsumer: Consumer;
    let payload: NotificationPayload;

    switch (notificationWorkflowType) {
      case NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        payload = NotificationPayloadMapper.toDepositCompletedEvent(consumer, transaction);
        await this.notificationService.sendNotification(NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.DEPOSIT_FAILED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        payload = NotificationPayloadMapper.toDepositFailedEvent(consumer, transaction);
        await this.notificationService.sendNotification(NotificationEventType.SEND_DEPOSIT_FAILED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.WITHDRAWAL_COMPLETED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        payload = NotificationPayloadMapper.toWithdrawalCompletedEvent(consumer, transaction);
        await this.notificationService.sendNotification(NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.WITHDRAWAL_FAILED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        payload = NotificationPayloadMapper.toWithdrawalFailedEvent(consumer, transaction);
        await this.notificationService.sendNotification(NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.TRANSFER_COMPLETED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        creditConsumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
        payload = NotificationPayloadMapper.toTransferCompletedEvent(consumer, creditConsumer, transaction);
        await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT, payload);
        payload = NotificationPayloadMapper.toTransferReceivedEvent(consumer, creditConsumer, transaction);
        await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.TRANSFER_FAILED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
        creditConsumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
        payload = NotificationPayloadMapper.toTransferFailedEvent(consumer, creditConsumer, transaction);
        await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_FAILED_EVENT, payload);
        break;
      case NotificationWorkflowTypes.PAYROLL_DEPOSIT_COMPLETED_EVENT:
        consumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
        const employer = await this.employerService.getEmployerForTransactionID(transactionID);
        payload = NotificationPayloadMapper.toPayrollDepositCompletedEvent(consumer, transaction, employer.name);
        await this.notificationService.sendNotification(
          NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT,
          payload,
        );
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

    const payload = NotificationPayloadMapper.toUpdatePayrollStatusEvent(payroll.id, status);

    await this.notificationService.sendNotification(NotificationEventType.SEND_UPDATE_PAYROLL_STATUS_EVENT, payload);
  }
}
