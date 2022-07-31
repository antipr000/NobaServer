import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Logger } from "winston";
import { Transaction } from "../domain/Transaction";
import { CryptoTransactionStatus, TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { TransactionQueueName } from "./QueuesMeta";
import { MessageProcessor } from "./message.processor";
import { SqsClient } from "./sqs.client";

export class CryptoTransactionStatusProcessor extends MessageProcessor {

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
  ) {
    super(logger, transactionRepo, sqsClient, consumerService, transactionService, TransactionQueueName.CryptoTransactionInitiated);
  }

  async processMessage(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.CRYPTO_OUTGOING_INITIATED) {
      this.logger.info(`Transaction is not initiated yet, skipping ${status}`);
      return;
    }

    try {
      const consumer = await this.consumerService.getConsumer(transaction.props.userId);
      // check transaction status here
      const cryptoRes = await this.transactionService.cryptoTransactionStatus(consumer, transaction);
      if (cryptoRes.status === CryptoTransactionStatus.COMPLETED) {
        this.logger.info(
          `Crypto transaction for Transaction ${transactionId} is completed with ID ${cryptoRes.onChainTransactionID}`,
        );
        transaction.props.transactionStatus = TransactionStatus.CRYPTO_OUTGOING_COMPLETED;
        if (cryptoRes.onChainTransactionID != null) {
          // TODO(#310) - need to poll for this
          transaction.props.blockchainTransactionId = cryptoRes.onChainTransactionID;
        }
      } else if (cryptoRes.status === CryptoTransactionStatus.INITIATED) {
        // TODO(#310) We need to poll and/or use websocket until we get an on-chain transaction ID
        transaction.props.transactionStatus = TransactionStatus.CRYPTO_OUTGOING_PENDING;
      } else if (cryptoRes.status === CryptoTransactionStatus.FAILED) {
        this.logger.info(
          `Crypto transaction for Transaction ${transactionId} failed, crypto transaction id : ${transaction.props.cryptoTransactionId}`,
        );

        await this.processFailure(
          TransactionStatus.CRYPTO_OUTGOING_FAILED,
          "Failed to settle crypto transaction.", // TODO: Need more detail here - should throw exception from cryptoTransactionStatus with detailed reason
          transaction,
        );
        return;
      }
    } catch (err) {
      this.logger.error("Caught exception in CryptoTransactionStatusProcessor. Moving to failed queue.", err);
      await this.processFailure(
        TransactionStatus.CRYPTO_OUTGOING_FAILED,
        "Failed to settle crypto transaction.", // TODO: Need more detail here - should throw exception from cryptoTransactionStatus with detailed reason
        transaction,
      );
      return;
    }

    transaction = await this.transactionRepo.updateTransaction(Transaction.createTransaction({ ...transaction.props }));

    //Move to completed queue, poller will take delay as it's scheduled so we move it to the target queue directly from here
    if (transaction.props.transactionStatus === TransactionStatus.CRYPTO_OUTGOING_COMPLETED) {
      // await this.queueProcessorHelper.enqueueTransaction(TransactionQueueName.TransactionCompleted, transactionId);
    } else if (transaction.props.transactionStatus === TransactionStatus.CRYPTO_OUTGOING_FAILED) {
      await this.sqsClient.enqueue(TransactionQueueName.TransactionFailed, transactionId);
    }
  }
}
