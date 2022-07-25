import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PendingTransactionValidationStatus } from "../../consumer/domain/Types";
import { Logger } from "winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { TransactionQueueName } from "./QueuesMeta";
import { MessageProcessor, QueueProcessorHelper } from "./QueueProcessorHelper";

@Injectable()
export class ValidatePendingTransactionProcessor implements MessageProcessor {
  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  @Inject()
  private readonly consumerService: ConsumerService;

  @Inject()
  private readonly transactionService: TransactionService;

  private queueProcessorHelper: QueueProcessorHelper;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    this.queueProcessorHelper = new QueueProcessorHelper(this.logger);
    this.init();
  }

  async init() {
    const app = this.queueProcessorHelper.createConsumer(TransactionQueueName.PendingTransactionValidation, this);

    app.start();
  }

  async process(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    let consumer = await this.consumerService.getConsumer(transaction.props.userId);

    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.PENDING) {
      this.logger.info(`Transaction ${transactionId} is not in pending state, skipping, status: ${status}`);
      return;
    }

    // This logic should be idempotent so we don't need to check whether we failed between here and transaction update
    const validationStatus = await this.transactionService.validatePendingTransaction(consumer, transaction);
    const updatedStatus =
      validationStatus === PendingTransactionValidationStatus.PASS
        ? TransactionStatus.VALIDATION_PASSED
        : TransactionStatus.VALIDATION_FAILED;

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: updatedStatus,
      }),
    );

    if (updatedStatus === TransactionStatus.VALIDATION_FAILED) {
      await this.queueProcessorHelper.enqueueTransaction(TransactionQueueName.TransactionFailed, transactionId);
    } else {
      //Move to initiated queue, db poller will take delay to put it to queue as it's scheduled so we move it to the target queue directly from here
      await this.queueProcessorHelper.enqueueTransaction(TransactionQueueName.FiatTransactionInitiator, transactionId);
    }
  }
}
