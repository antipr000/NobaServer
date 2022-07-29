import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { TransactionStatus } from "../domain/Types";
import { TransactionQueueName } from "../queueprocessors/QueuesMeta";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { Transaction } from "../domain/Transaction";
import { Cron } from "@nestjs/schedule";
import { QueueProcessorHelper } from "../queueprocessors/QueueProcessorHelper";

const transactionStatusToQueueMap: { [key: string]: TransactionQueueName } = {
  [TransactionStatus.PENDING]: TransactionQueueName.PendingTransactionValidation,
  [TransactionStatus.VALIDATION_PASSED]: TransactionQueueName.FiatTransactionInitiator,
  [TransactionStatus.VALIDATION_FAILED]: TransactionQueueName.TransactionFailed,
  [TransactionStatus.FIAT_INCOMING_INITIATED]: TransactionQueueName.FiatTransactionInitiated,
  [TransactionStatus.FIAT_INCOMING_INITIATING]: TransactionQueueName.FiatTransactionInitiator,
  [TransactionStatus.FIAT_INCOMING_COMPLETED]: TransactionQueueName.FiatTransactionCompleted,
  [TransactionStatus.FIAT_INCOMING_FAILED]: TransactionQueueName.TransactionFailed,
  [TransactionStatus.CRYPTO_OUTGOING_INITIATING]: TransactionQueueName.CryptoTransactionCompleted,
  [TransactionStatus.CRYPTO_OUTGOING_INITIATED]: TransactionQueueName.CryptoTransactionInitiated,
  [TransactionStatus.CRYPTO_OUTGOING_COMPLETED]: TransactionQueueName.OnChainPendingTransaction,
  [TransactionStatus.CRYPTO_OUTGOING_FAILED]: TransactionQueueName.TransactionFailed,
};

@Injectable()
export class PendingTransactionDBPollerService {
  private isCronRunning = false;
  private queueProcessorHelper: QueueProcessorHelper;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject("TransactionRepo") private readonly transactionRepo: ITransactionRepo,
  ) {
    this.queueProcessorHelper = new QueueProcessorHelper(this.logger);
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
    this.logger.debug("Polling for pending transactions");
    const pendingTransactions = await this.transactionRepo.getPendingTransactions();
    this.logger.debug(`Found ${pendingTransactions.length} pending transactions`);
    pendingTransactions.forEach(async (transaction: Transaction) => {
      const status: TransactionStatus = transaction.props.transactionStatus;

      const timeElapsed = Date.now() - transaction.props.transactionTimestamp.getTime();

      // TODO(#324): Evaluate the polling time as ON_CHAIN transaction can take more than 1hr to finish sometimes.
      if (timeElapsed > 1000 * 60 * 30) {
        this.logger.debug(`Transaction ${transaction.props._id} is older than 30 minutes, won't poll it further`);
        await this.disablePolling(transaction);
        return;
      }

      if (status === TransactionStatus.COMPLETED || status === TransactionStatus.FAILED) {
        this.logger.debug(`Transaction ${transaction.props._id} is finished processing, won't poll it further`);
        await this.disablePolling(transaction);
        return;
      }

      if (!(status in transactionStatusToQueueMap)) {
        throw new Error("No Queue name found for transaction status: " + status);
      }

      const targetQueue = transactionStatusToQueueMap[status];
      if (targetQueue === TransactionQueueName.OnChainPendingTransaction) {
        // TODO(#): Replace this field with "last updated timestamp"
        const secondElapsed: number = (new Date().getTime() - transaction.props.transactionTimestamp.getTime()) / 1000;
        if (secondElapsed < 1 * 60) {
          // No need to poll. Just wait until 5 mins have elapsed.
          return;
        }
      }

      try {
        this.logger.debug("Enqueueing from poller");
        await this.queueProcessorHelper.enqueueTransaction(targetQueue, transaction.props._id);
      } catch (err) {
        console.log("Error", err);
      }
      // we will only poll it after 15 seconds if it's not yet processed again, we will process from one queue to another queue
      transaction.setDBPollingTimeAfterNSeconds(15);
      await this.transactionRepo.updateTransaction(transaction);
    });
  }

  private async disablePolling(transaction: Transaction) {
    transaction.disableDBPolling();
    await this.transactionRepo.updateTransaction(transaction);
  }
}
