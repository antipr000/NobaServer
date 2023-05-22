import { Inject, Injectable } from "@nestjs/common";
import { NotificationEventType, NotificationWorkflowTypes } from "./domain/NotificationTypes";
import { ConsumerService } from "../consumer/consumer.service";
import { TransactionService } from "../transaction/transaction.service";
import { NotificationService } from "./notification.service";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { NotificationPayloadMapper } from "./domain/NotificationPayload";
import { TransactionNotificationPayloadMapper } from "./domain/TransactionNotificationParameters";
import { PayrollStatus } from "../employer/domain/Payroll";
import { EmployerService } from "../employer/employer.service";
import { LatestNotificationResponse } from "./dto/latestnotification.response.dto";
import { SendNotificationRequestDTO } from "./dto/SendNotificationRequestDTO";
import { Transaction } from "../transaction/domain/Transaction";

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

  async sendNotification(
    notificationWorkflowType: NotificationWorkflowTypes,
    request: SendNotificationRequestDTO,
  ): Promise<void> {
    switch (notificationWorkflowType) {
      case NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT:
        return this.sendDepositCompletedEventNotification(request.transactionID);
      case NotificationWorkflowTypes.DEPOSIT_FAILED_EVENT:
        return this.sendDepositFailedEventNotification(request.transactionID);
      case NotificationWorkflowTypes.WITHDRAWAL_COMPLETED_EVENT:
        return this.sendWithdrawalCompletedEventNotification(request.transactionID);
      case NotificationWorkflowTypes.WITHDRAWAL_FAILED_EVENT:
        return this.sendWithdrawalFailedEventNotification(request.transactionID);
      case NotificationWorkflowTypes.TRANSFER_COMPLETED_EVENT:
        return this.sendTransferCompletedEventNotification(request.transactionID);
      case NotificationWorkflowTypes.TRANSFER_FAILED_EVENT:
        return this.sendTransferFailedEventNotification(request.transactionID);
      case NotificationWorkflowTypes.PAYROLL_DEPOSIT_COMPLETED_EVENT:
        return this.sendPayrollDepositCompletedEventNotification(request.transactionID);
      case NotificationWorkflowTypes.UPDATE_PAYROLL_STATUS_EVENT:
        return this.sendPayrollStatusUpdateNotification(request.payrollID, request.payrollStatus);
      case NotificationWorkflowTypes.CREDIT_ADJUSTMENT_COMPLETED_EVENT:
        return this.sendCreditAdjustmentCompletedEventNotification(request.transactionID);
      default:
        this.logger.error("Failed to send notification from workflow. Reason: Invalid notification type");
        throw new ServiceException({
          message: "Invalid notification type",
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        });
    }
  }

  private async validateAndGetTransactionFromID(transactionID: string): Promise<Transaction> {
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

    return transaction;
  }

  private async sendDepositCompletedEventNotification(transactionID: string): Promise<void> {
    const transaction = await this.validateAndGetTransactionFromID(transactionID);
    const consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
    const payload = NotificationPayloadMapper.toDepositCompletedEvent(consumer, transaction);
    await this.notificationService.sendNotification(NotificationEventType.SEND_DEPOSIT_COMPLETED_EVENT, payload);
  }

  private async sendDepositFailedEventNotification(transactionID: string): Promise<void> {
    const transaction = await this.validateAndGetTransactionFromID(transactionID);
    const consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
    const payload = NotificationPayloadMapper.toDepositFailedEvent(consumer, transaction);
    await this.notificationService.sendNotification(NotificationEventType.SEND_DEPOSIT_FAILED_EVENT, payload);
  }

  private async sendWithdrawalCompletedEventNotification(transactionID: string): Promise<void> {
    const transaction = await this.validateAndGetTransactionFromID(transactionID);
    const consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
    const payload = NotificationPayloadMapper.toWithdrawalCompletedEvent(consumer, transaction);
    await this.notificationService.sendNotification(NotificationEventType.SEND_WITHDRAWAL_COMPLETED_EVENT, payload);
  }

  private async sendWithdrawalFailedEventNotification(transactionID: string): Promise<void> {
    const transaction = await this.validateAndGetTransactionFromID(transactionID);
    const consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
    const payload = NotificationPayloadMapper.toWithdrawalFailedEvent(consumer, transaction);
    await this.notificationService.sendNotification(NotificationEventType.SEND_WITHDRAWAL_FAILED_EVENT, payload);
  }

  private async sendTransferCompletedEventNotification(transactionID: string): Promise<void> {
    const transaction = await this.validateAndGetTransactionFromID(transactionID);
    const consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
    const creditConsumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
    let payload = NotificationPayloadMapper.toTransferCompletedEvent(consumer, creditConsumer, transaction);
    await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_COMPLETED_EVENT, payload);

    payload = NotificationPayloadMapper.toTransferReceivedEvent(consumer, creditConsumer, transaction);
    await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_RECEIVED_EVENT, payload);
  }

  private async sendTransferFailedEventNotification(transactionID: string): Promise<void> {
    const transaction = await this.validateAndGetTransactionFromID(transactionID);
    const consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
    const creditConsumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
    const payload = NotificationPayloadMapper.toTransferFailedEvent(consumer, creditConsumer, transaction);
    await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_FAILED_EVENT, payload);
  }

  private async sendPayrollDepositCompletedEventNotification(transactionID: string): Promise<void> {
    const transaction = await this.validateAndGetTransactionFromID(transactionID);
    const consumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
    const employer = await this.employerService.getEmployerForTransactionID(transactionID);
    const payload = NotificationPayloadMapper.toPayrollDepositCompletedEvent(consumer, transaction, employer.name);
    await this.notificationService.sendNotification(
      NotificationEventType.SEND_PAYROLL_DEPOSIT_COMPLETED_EVENT,
      payload,
    );
  }

  private async sendPayrollStatusUpdateNotification(payrollID: string, status: PayrollStatus) {
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

  private async sendCreditAdjustmentCompletedEventNotification(transactionID: string): Promise<void> {
    const transaction = await this.validateAndGetTransactionFromID(transactionID);
    const consumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
    const creditConsumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
    const payload = NotificationPayloadMapper.toCreditAdjustmentCompletedEvent(consumer, transaction);
    await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSFER_FAILED_EVENT, payload);
  }

  async getPreviousNotifications(): Promise<LatestNotificationResponse> {
    return await this.notificationService.getPreviousNotifications();
  }

  async clearPreviousNotifications(): Promise<void> {
    await this.notificationService.clearPreviousNotifications();
  }
}
