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

    let newStatus: TransactionStatus;
    try {
      const consumer = await this.consumerService.getConsumer(transaction.props.userId);
      // check transaction status here
      const cryptoRes = await this.transactionService.cryptoTransactionStatus(consumer, transaction);
      this.logger.info("Crypto status is " + cryptoRes.status);
      if (cryptoRes.status === CryptoTransactionStatus.COMPLETED) {
        if (!cryptoRes.onChainTransactionID) {
          // If we have a status of COMPLETED but no on-chain ID it really shouldn't take more than another poll cycle or two to get that on-chain ID. So fail after 5 minutes.
          const timeElapsed = Date.now() - transaction.props.transactionTimestamp.getTime();
          if (timeElapsed > 5 * 1000 * 60) {
            this.logger.warn(`${transactionId} - status is COMPLETED but no on-chain ID available. Disabling polling.`);
            transaction.disableDBPolling();
            await this.transactionRepo.updateTransaction(transaction);
            return;
          }

          // Wait for another poll cycle
          this.logger.info(`${transactionId} - completed - going another poll cycle to get on-chain ID`);
          return;
        }

        this.logger.info(
          `Crypto transaction for Transaction ${transactionId} is completed with ID ${cryptoRes.onChainTransactionID}`,
        );
        transaction.props.blockchainTransactionId = cryptoRes.onChainTransactionID;
        newStatus = TransactionStatus.CRYPTO_OUTGOING_COMPLETED;
      } else if (cryptoRes.status === CryptoTransactionStatus.INITIATED) {
        // If we have a status of COMPLETED but no on-chain ID it really shouldn't take more than another poll cycle or two to get that on-chain ID. So fail after 5 minutes.
        const timeElapsed = Date.now() - transaction.props.transactionTimestamp.getTime();
        if (timeElapsed > 15 * 1000 * 60) {
          this.logger.warn(`${transactionId} - status has been INITIATED for 15 minutes. Disabling polling.`);
          transaction.disableDBPolling();
          await this.transactionRepo.updateTransaction(transaction);
          return;
        }

        this.logger.info(`${transactionId} - initiated - going another poll cycle to get on-chain ID`);
        //newStatus = TransactionStatus.CRYPTO_OUTGOING_PENDING;
        return;
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

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({ ...transaction.props, transactionStatus: newStatus }),
    );

    //Move to completed queue, poller will take delay as it's scheduled so we move it to the target queue directly from here
    if (newStatus === TransactionStatus.CRYPTO_OUTGOING_COMPLETED) {
      // await this.queueProcessorHelper.enqueueTransaction(TransactionQueueName.TransactionCompleted, transactionId);
    } else if (newStatus === TransactionStatus.CRYPTO_OUTGOING_FAILED) {
      await this.sqsClient.enqueue(TransactionQueueName.TransactionFailed, transactionId);
    }
  }
}
