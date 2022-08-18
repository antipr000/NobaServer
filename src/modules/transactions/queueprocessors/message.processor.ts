import { LockService } from "../../../modules/common/lock.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { Logger } from "winston";
import { Transaction, TransactionEvent } from "../domain/Transaction";
import { TransactionStatus, TransactionQueueName } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { SqsClient } from "./sqs.client";
import { ObjectType } from "../../../modules/common/domain/ObjectType";

export abstract class MessageProcessor {
  constructor(
    protected readonly logger: Logger,
    protected readonly transactionRepo: ITransactionRepo,
    protected readonly sqsClient: SqsClient,
    protected readonly consumerService: ConsumerService,
    protected readonly transactionService: TransactionService,
    protected readonly transactionQueue: TransactionQueueName,
    protected readonly lockService: LockService,
  ) {
    const app = sqsClient.subscribeToQueue(transactionQueue, this);
    app.start();
  }

  // TODO(#377): Use activeTransaction in all processors instead of fetching transaction at first
  protected activeTransaction: Transaction;
  protected abstract processMessageInternal(transactionId: string): Promise<void>;

  public async processMessage(transactionId: string): Promise<void> {
    const lockId = await this.lockService.acquireLockForKey(transactionId, ObjectType.TRANSACTION);
    if (lockId) {
      this.activeTransaction = await this.transactionRepo.updateLastProcessingTimestamp(transactionId);
      await this.processMessageInternal(transactionId);
      await this.lockService.releaseLockForKey(transactionId, ObjectType.TRANSACTION);
    } else {
      this.logger.debug(`Transaction ${transactionId} being processed by another worker`);
    }
  }

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
