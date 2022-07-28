import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionQueueName } from "./QueuesMeta";
import { MessageProcessor, QueueProcessorHelper } from "./QueueProcessorHelper";
import { ZeroHashService } from "../zerohash.service";
import { ConsumerService } from "../../consumer/consumer.service";
import { EmailService } from "../../common/email.service";

@Injectable()
export class OnChainPendingProcessor implements MessageProcessor {
  private queueProcessorHelper: QueueProcessorHelper;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) readonly logger: Logger,
    private readonly zerohashService: ZeroHashService,
    @Inject("TransactionRepo") private readonly transactionRepo: ITransactionRepo,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(ConsumerService) private readonly consumerService: ConsumerService,
  ) {
    this.queueProcessorHelper = new QueueProcessorHelper(this.logger);
    this.init();
  }

  async init() {
    const app = this.queueProcessorHelper.createConsumer(TransactionQueueName.OnChainPendingTransaction, this);

    app.start();
  }

  async process(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.CRYPTO_OUTGOING_COMPLETED) {
      this.logger.info(
        `Transaction ${transactionId} is not in ${TransactionStatus.CRYPTO_OUTGOING_COMPLETED} status, skipping, current status: ${status}`,
      );
      return;
    }

    // No need to guard this with an intermediate Transaction state
    // as this processor is idempotent.
    const withdrawalResponse = await this.zerohashService.getWithdrawal(transaction.props.zhWithdrawalID);
    this.logger.info("Withdrawal Response: " + JSON.stringify(withdrawalResponse));

    const onChainStatus = withdrawalResponse["message"][0]["on_chain_status"];
    if (onChainStatus === "PENDING") {
      // no-op
      // TODO(#): Update the transaction timestamp.
      return;
    } else if (onChainStatus === "CONFIRMED") {
      // Final amount of crypto
      const originalAmount = transaction.props.leg2Amount;
      const settledTimestamp = new Date();
      const finalSettledAmount = withdrawalResponse["message"][0]["settled_amount"];
      await this.transactionRepo.updateTransaction(
        Transaction.createTransaction({
          ...transaction.props,
          settledTimestamp: settledTimestamp, // This doesn't seem to come from ZH so this is the best we can do
          leg2Amount: finalSettledAmount,
          transactionStatus: TransactionStatus.COMPLETED,
        }),
      );

      const consumer = await this.consumerService.getConsumer(transaction.props.userId);
      const paymentMethod = consumer.getPaymentMethodByID(transaction.props.paymentMethodID);
      if (paymentMethod == null) {
        // Should never happen if we got this far
        this.logger.error(`Unknown payment method "${paymentMethod}" for consumer ${consumer.props._id}`);
        return;
      }

      await this.emailService.sendOrderExecutedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.email,
        {
          transactionID: transaction.props._id,
          transactionTimestamp: transaction.props.transactionTimestamp,
          settledTimestamp: settledTimestamp,
          transactionHash: transaction.props.blockchainTransactionId,
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
          cryptoAmountExpected: originalAmount, // This is the original quoted amount
        },
      );
    } else {
      this.logger.error(`Unknown on_chain_status: ${onChainStatus} for transaction id ${transaction.props._id}`);
    }

    // await this.queueProcessorHelper.enqueueTransaction(TransactionQueueName.TransactionCompleted, transactionId);
  }
}
