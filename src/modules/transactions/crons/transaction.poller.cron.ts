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
      // `transactionAttr.waitTimeInMilliSecondsBeforeRequeue` seconds.
      //
      // => CURRENT_TIME - LAST_UPDATED_TIME >= waitTimeInMilliSecondsBeforeRequeue
      // => LAST_UPDATED_TIME <= CURRENT_TIME - waitTimeInMilliSecondsBeforeRequeue
      //
      const allowedTransactionTime: number = Date.now().valueOf() - transactionAttr.waitTimeInMilliSecondsBeforeRequeue;

      const pendingTransactionsWithCurrentAttr = await this.transactionRepo.getTransactionsBeforeTime(
        allowedTransactionTime,
        transactionAttr.transactionStatus,
      );
      allAsyncOperations.push(this.enqueueTransactions(pendingTransactionsWithCurrentAttr, transactionAttr));
    }

    return Promise.all(allAsyncOperations);
  }

  private async enqueueTransactions(transactions: Transaction[], transactionAttributes: TransactionStateAttributes) {
    const allEnqueueOperations = [];
    transactions.forEach(transaction => {
      allEnqueueOperations.push(this.sqsClient.enqueue(transactionAttributes.processingQueue, transaction.props._id));
    });

    return Promise.all(allEnqueueOperations);
  }
}
