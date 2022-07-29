import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionQueueName } from "./QueuesMeta";
import { MessageProcessor, QueueProcessorHelper } from "./QueueProcessorHelper";
import { CheckoutValidationError, CHECKOUT_VALIDATION_ERROR_HTTP_CODE } from "../domain/CheckoutErrorTypes";
import { VerificationService } from "../../../modules/verification/verification.service";
import { BadRequestException } from "@nestjs/common";
import { EmailService } from "../../../modules/common/email.service";

@Injectable()
export class TransactionFailedProcessor implements MessageProcessor {
  private queueProcessorHelper: QueueProcessorHelper;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @Inject("TransactionRepo") private readonly transactionRepo: ITransactionRepo,
    @Inject(EmailService) private readonly emailService: EmailService,
    private readonly consumerService: ConsumerService,
  ) {
    this.queueProcessorHelper = new QueueProcessorHelper(this.logger);
    this.init();
  }

  async init() {
    const app = this.queueProcessorHelper.createConsumer(TransactionQueueName.TransactionFailed, this);

    app.start();
  }

  async process(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (
      status != TransactionStatus.FIAT_INCOMING_REVERSAL_FAILED &&
      status != TransactionStatus.FIAT_INCOMING_FAILED &&
      status != TransactionStatus.CRYPTO_OUTGOING_FAILED &&
      status != TransactionStatus.VALIDATION_FAILED
    ) {
      this.logger.info(`Transaction ${transactionId} is not in the correct status, skipping, status: ${status}`);
      return;
    }
    const consumer = await this.consumerService.getConsumer(transaction.props.userId);
    const paymentMethod = consumer.getPaymentMethodByID(transaction.props.paymentMethodID);
    if (paymentMethod == null) {
      // Should never happen if we got this far
      this.logger.error(`Unknown payment method "${paymentMethod}" for consumer ${consumer.props._id}`);
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
    if (transaction.props.transactionExceptions.length > 0) {
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
          this.logger.error(`Unknown status in TransactionFailedProcessor: ${status}`);
      }
    } else {
      errorMessage =
        transaction.props.transactionExceptions[transaction.props.transactionExceptions.length - 1].message;
    }

    await this.emailService.sendOrderFailedEmail(
      consumer.props.firstName,
      consumer.props.lastName,
      consumer.props.email,
      {
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
    );
  }
}
