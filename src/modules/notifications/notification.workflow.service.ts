import { Inject, Injectable } from "@nestjs/common";
import { NotificationEventType, NotificationWorkflowTypes } from "./domain/NotificationTypes";
import { ConsumerService } from "../consumer/consumer.service";
import { TransactionService } from "../transaction/transaction.service";
import { NotificationService } from "./notification.service";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

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

  async initiateNotificationSending(
    notificationWorkflowType: NotificationWorkflowTypes,
    transactionID: string,
  ): Promise<void> {
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
        if (transaction.debitConsumerID) {
          const consumer = await this.consumerService.getConsumer(transaction.debitConsumerID);
          await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT, {
            email: consumer.props.email,
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            orderExecutedParams: {
              transactionID: transaction.id,
              transactionTimestamp: transaction.updatedTimestamp,
              paymentMethod: "",
              destinationWalletAddress: "",
              last4Digits: "",
              fiatCurrency: transaction.debitCurrency,
              conversionRate: transaction.exchangeRate,
              processingFee: 0,
              networkFee: 0,
              nobaFee: 0,
              totalPrice: transaction.debitAmount,
              cryptoAmount: 0,
              cryptocurrency: "",
              status: transaction.status,
              transactionHash: transaction.transactionRef,
              settledTimestamp: transaction.updatedTimestamp,
              cryptoAmountExpected: 0,
            },
          });
        }

        if (transaction.creditConsumerID) {
          const consumer = await this.consumerService.getConsumer(transaction.creditConsumerID);
          await this.notificationService.sendNotification(NotificationEventType.SEND_TRANSACTION_COMPLETED_EVENT, {
            email: consumer.props.email,
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            orderExecutedParams: {
              transactionID: transaction.id,
              transactionTimestamp: transaction.updatedTimestamp,
              paymentMethod: "",
              destinationWalletAddress: "",
              last4Digits: "",
              fiatCurrency: transaction.creditCurrency,
              conversionRate: transaction.exchangeRate,
              processingFee: 0,
              networkFee: 0,
              nobaFee: 0,
              totalPrice: transaction.creditAmount,
              cryptoAmount: 0,
              cryptocurrency: "",
              status: transaction.status,
              transactionHash: transaction.transactionRef,
              settledTimestamp: transaction.updatedTimestamp,
              cryptoAmountExpected: 0,
            },
          });
        }

      case NotificationWorkflowTypes.TRANSACTION_FAILED_EVENT:

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
