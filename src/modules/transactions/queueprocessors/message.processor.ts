import { ConsumerService } from "src/modules/consumer/consumer.service";
import { Logger } from "winston";
import { Transaction, TransactionEvent } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { TransactionQueueName } from "./QueuesMeta";
import { SqsClient } from "./sqs.client";

export abstract class MessageProcessor {
  constructor(
    protected readonly logger: Logger,
    protected readonly transactionRepo: ITransactionRepo,
    protected readonly sqsClient: SqsClient,
    protected readonly consumerService: ConsumerService,
    protected readonly transactionService: TransactionService,
    protected readonly transactionQueue: TransactionQueueName,
  ) {
    const app = sqsClient.subscribeToQueue(transactionQueue, this);
    app.start();
  }

  public abstract processMessage(transactionId: string): void;

  // Handle any unexpected error like connection to the queue is broken.
  public subscriptionErrorHandler(err: Error) {
    this.logger.error(`Error in '${this.transactionQueue}' queue subscription. Find the stack trace below - \n`);
    this.logger.error(err.stack);
  }

  public processingErrorHandler(err: Error) {
    // Ideally every error should be handled in `processMessage()` along with `processFailure()`.
    this.logger.error(`Unexpected error occured - "${err.message}". Find the stack trace below - \n`);
    this.logger.error(err.stack);
  }

  protected async processFailure(status: TransactionStatus, reason: string, transaction: Transaction) {
    const existingExceptions = transaction.props.transactionExceptions;

    // TODO (#332) Improve population of details (internal details, not to be viewed by consumer)
    const error: TransactionEvent = { timestamp: new Date(), message: reason, details: reason };

    await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: status,
        transactionExceptions: [...existingExceptions, error],
      }),
    );
    await this.sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id);
  }
}
