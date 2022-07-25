import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { TransactionStatus } from "../domain/Types";
import { getTransactionQueueProducers, TransactionQueueName } from "../queueprocessors/QueuesMeta";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { Producer } from "sqs-producer";
import { Transaction } from "../domain/Transaction";
import { Cron } from "@nestjs/schedule";

const transactionStatusToQueueMap: { [key: string]: TransactionQueueName } = {
  [TransactionStatus.PENDING]: TransactionQueueName.PendingTransactionValidation,
  [TransactionStatus.VALIDATION_PASSED]: TransactionQueueName.FiatTransactionInitiator,
  [TransactionStatus.FIAT_INCOMING_INITIATED]: TransactionQueueName.FiatTransactionInitated,
  [TransactionStatus.FIAT_INCOMING_COMPLETED]: TransactionQueueName.FiatTransactionCompleted,
  [TransactionStatus.FIAT_INCOMING_FAILED]: TransactionQueueName.TransactionFailed,
  [TransactionStatus.CRYPTO_OUTGOING_INITIATING]: TransactionQueueName.CryptoTransactionCompleted,
  [TransactionStatus.CRYPTO_OUTGOING_INITIATED]: TransactionQueueName.CryptoTransactionInitiated,
  [TransactionStatus.CRYPTO_OUTGOING_COMPLETED]: TransactionQueueName.TransactionCompleted,
  [TransactionStatus.CRYPTO_OUTGOING_FAILED]: TransactionQueueName.TransactionFailed,
};

@Injectable()
export class PendingTransactionDBPollerService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  private readonly queueProducers: Record<TransactionQueueName, Producer>;

  private isCronRunning = false;

  constructor() {
    this.queueProducers = getTransactionQueueProducers();
  }

  //every 5 seconds for now, we should be using db streams actually but it's fine for now
  @Cron("*/5 * * * * *", { name: "PendingTransactionsDBPoller" })
  async handleCron() {
    if (this.isRunningConditonMet()) {
      this.isCronRunning = true; // prevents rescheduling of this cron job if previous run is still running
      try {
        await this.handlePendingTransactions();
      } catch (err) {
        this.logger.error("Error while processing pending transactions", err);
      }
      this.isCronRunning = false;
    }
  }

  private isRunningConditonMet() {
    return !this.isCronRunning;
  }

  private async handlePendingTransactions() {
    this.logger.info("Polling for pending transactions");
    const pendingTransactions = await this.transactionRepo.getPendingTransactions();
    this.logger.info(`Found ${pendingTransactions.length} pending transactions`);
    pendingTransactions.forEach(async transaction => {
      const status: TransactionStatus = transaction.props.transactionStatus;

      const timeElapsed = Date.now() - transaction.props.transactionTimestamp.getTime();

      if (timeElapsed > 1000 * 60 * 30) {
        this.logger.info(`Transaction ${transaction.props._id} is older than 30 minutes, won't poll it further`);
        await this.disablePolling(transaction);
        return;
      }

      if (status === TransactionStatus.COMPLETED) {
        this.logger.info(`Transaction ${transaction.props._id} is completed, won't poll it further`);
        await this.disablePolling(transaction);
        return;
      }

      if (!(status in transactionStatusToQueueMap)) {
        throw new Error("No Queue name found for transaction status: " + status);
      }

      const targetQueue = transactionStatusToQueueMap[status];

      this.logger.info(`Sending transaction ${transaction.props._id} to queue ${targetQueue}`);

      const result = await this.queueProducers[targetQueue].send({
        id: transaction.props._id,
        body: `${transaction.props._id}`,
      }); // we can send in batch TODO add batching logic

      // we will only poll it after 15 seconds if it's not yet processed again, we will process from one queue to another queue
      transaction.setDBPollingTimeAfterNSeconds(15);
      await this.transactionRepo.updateTransaction(transaction);

      this.logger.info(`Sent transaction ${transaction.props._id} to queue ${targetQueue}`);
    });
  }

  private async disablePolling(transaction: Transaction) {
    transaction.disableDBPolling();
    await this.transactionRepo.updateTransaction(transaction);
  }
}
