import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Logger } from "winston";
import { Transaction } from "../domain/Transaction";
import { CryptoTransactionStatus, TransactionStatus, TransactionQueueName } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { MessageProcessor } from "./message.processor";
import { SqsClient } from "./sqs.client";
import { EmailService } from "../../../modules/common/email.service";

export class CryptoTransactionStatusProcessor extends MessageProcessor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
    private readonly emailService: EmailService,
  ) {
    super(
      logger,
      transactionRepo,
      sqsClient,
      consumerService,
      transactionService,
      TransactionQueueName.CryptoTransactionInitiated,
    );
  }

  async processMessage(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.CRYPTO_OUTGOING_INITIATED) {
      this.logger.info(
        `Transaction with status ${status} should not be in queue ${TransactionQueueName.CryptoTransactionInitiated}`,
      );
      return;
    }

    // Skip all this if we already have a blockchain transaction id. Would only be the case if we failed near the end.
    if (!transaction.props.blockchainTransactionId) {
      try {
        // check transaction status here
        const tradeStatus = await this.transactionService.checkTradeStatus(transaction);
        if (tradeStatus === CryptoTransactionStatus.INITIATED) {
          // Ensure we don't poll forever if status never moves off INITIATED. 15 minutes should be enough time.
          const timeElapsed = Date.now() - transaction.props.transactionTimestamp.getTime();
          if (timeElapsed > 15 * 1000 * 60) {
            // this.logger.warn(`${transactionId} - status has been INITIATED for 15 minutes. Disabling polling.`);
            // transaction.disableDBPolling();
            // await this.transactionRepo.updateTransaction(Transaction.createTransaction({ ...transaction.props }));
            this.processFailure(status, `${transactionId} - status has been INITIATED for 15 minutes.`, transaction);
            return;
          }

          this.logger.debug(`${transactionId} - initiated - going another poll cycle until status is COMPLETED`);
          return;
        } else if (tradeStatus === CryptoTransactionStatus.COMPLETED) {
          await this.transactionRepo.updateTransaction(
            Transaction.createTransaction({
              ...transaction.props,
              transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
            }),
          );
        } else if (tradeStatus === CryptoTransactionStatus.FAILED) {
          this.logger.info(
            `Crypto transaction for Transaction ${transactionId} failed, crypto transaction id : ${transaction.props.cryptoTransactionId}`,
          );

          await this.processFailure(
            TransactionStatus.CRYPTO_OUTGOING_FAILED,
            "Failed to settle crypto transaction.", // TODO(#342): Need more detail here - should throw exception from cryptoTransactionStatus with detailed reason
            transaction,
          );
          return;
        }
      } catch (err) {
        this.logger.error("Caught exception in CryptoTransactionStatusProcessor. Moving to failed queue.", err);
        await this.processFailure(
          TransactionStatus.CRYPTO_OUTGOING_FAILED,
          "Failed to settle crypto transaction.", // TODO(#342): Need more detail here - should throw exception from cryptoTransactionStatus with detailed reason
          transaction,
        );

        const consumer = await this.consumerService.getConsumer(transaction.props.userId);
        const paymentMethod = consumer.getPaymentMethodByID(transaction.props.paymentMethodID);
        if (paymentMethod == null) {
          // Should never happen if we got this far
          this.logger.error(`Unknown payment method "${paymentMethod}" for consumer ${consumer.props._id}`);
          return;
        }

        await this.emailService.sendCryptoFailedEmail(
          consumer.props.firstName,
          consumer.props.lastName,
          consumer.props.displayEmail,
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
            failureReason: "Failed to settle crypto transaction", // TODO: Better message
          },
        );
        return;
      }
    }
  }
}
