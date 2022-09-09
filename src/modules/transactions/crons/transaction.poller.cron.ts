import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { allTransactionAttributes, TransactionStateAttributes } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { Transaction } from "../domain/Transaction";
import { Cron } from "@nestjs/schedule";
import { SqsClient } from "../queueprocessors/sqs.client";

export class TransactionPollerService {
  private isRunning = false;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject("TransactionRepo") private readonly transactionRepo: ITransactionRepo,
    private readonly sqsClient: SqsClient,
  ) {}

  //every 5 seconds for now, we should be using db streams actually but it's fine for now
  @Cron("*/5 * * * * *", { name: "TransactionsPoller" })
  async handleCron() {
    if (this.isRunning) return;
    // prevents rescheduling of this cron job if previous run is still running
    this.isRunning = true;

    try {
      await this.handlePendingTransactions();
    } catch (err) {
      this.logger.error("Error while processing pending transactions", err);
    }

    this.isRunning = false;
  }

  private async handlePendingTransactions() {
    this.logger.debug("Polling for pending transactions");
    const allAsyncOperations = [];

    for (let i = 0; i < allTransactionAttributes.length; i += 1) {
      const transactionAttr: TransactionStateAttributes = allTransactionAttributes[i];
      // The idea is to not poll a transaction which have not been updated since
      // `transactionAttr.waitTimeInMilliSecondsBeforeRequeue` milli-seconds.
      //
      // => CURRENT_TIME - LAST_UPDATED_TIME >= waitTimeInMilliSecondsBeforeRequeue
      // => LAST_UPDATED_TIME <= CURRENT_TIME - waitTimeInMilliSecondsBeforeRequeue
      //
      const maxAllowedTransactionUpdateTime: number =
        Date.now().valueOf() - transactionAttr.waitTimeInMilliSecondsBeforeRequeue;

      // The idea is to NOT poll a transaction for which transaction-state haven't been
      // updated since `transactionAttr.maxAllowedMilliSecondsInThisStatus` milli-seconds.
      //
      // => CURRENT_TIME - LAST_STATUS_UPDATE_TIME <= maxAllowedMilliSecondsInThisStatus
      // => LAST_STATUS_UPDATE_TIME >= CURRENT_TIME - maxAllowedMilliSecondsInThisStatus
      //
      const minAllowedLastStatusUpdateTime: number =
        Date.now().valueOf() - transactionAttr.maxAllowedMilliSecondsInThisStatus;

      const pendingTransactionsWithCurrentAttr = await this.transactionRepo.getTransactionsToProcess(
        maxAllowedTransactionUpdateTime,
        minAllowedLastStatusUpdateTime,
        transactionAttr.transactionStatus,
      );
      allAsyncOperations.push(this.enqueueTransactions(pendingTransactionsWithCurrentAttr, transactionAttr));
    }

    return Promise.all(allAsyncOperations);
  }

  private async enqueueTransactions(transactions: Transaction[], transactionAttributes: TransactionStateAttributes) {
    const allEnqueueOperations = [];
    transactions.forEach(transaction => {
      const timeElapsedTillLastStatusUpdate = Date.now().valueOf() - transaction.props.lastStatusUpdateTimestamp;
      // TODO(#): This condition will never occur. Move it to new poller.
      if (timeElapsedTillLastStatusUpdate >= transactionAttributes.maxAllowedMilliSecondsInThisStatus) {
        const skippedTransactionInfo = {
          description: "Skipping transaction as it is in the same status for a long time",
          id: transaction.props._id,
          status: transaction.props.transactionStatus,
          timeTillStuck: Date.now().valueOf() - transaction.props.lastStatusUpdateTimestamp,
          maxAllowedMilliSecondsInThisStatus: transactionAttributes.maxAllowedMilliSecondsInThisStatus,
        };
        this.logger.error(`${JSON.stringify(skippedTransactionInfo)}`);
        return;
      }
      allEnqueueOperations.push(this.sqsClient.enqueue(transactionAttributes.processingQueue, transaction.props._id));
    });

    return Promise.all(allEnqueueOperations);
  }
}
