import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PendingTransactionValidationStatus } from "../../consumer/domain/Types";
import { Logger } from "winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { TransactionQueueName } from "./QueuesMeta";
import { SqsClient } from "./sqs.client";
import { MessageProcessor } from "./message.processor";

export class ValidatePendingTransactionProcessor extends MessageProcessor {
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
      TransactionQueueName.PendingTransactionValidation,
    );
  }

  async processMessage(transactionId: string) {
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

    if (updatedStatus === TransactionStatus.VALIDATION_FAILED) {
      await this.processFailure(
        updatedStatus,
        "Transaction validation failure.", // TODO (#332): Need more detail here - should throw exception from validatePendingTransaction with detailed reason
        transaction,
      );
    } else {
      transaction = await this.transactionRepo.updateTransaction(
        Transaction.createTransaction({
          ...transaction.props,
          transactionStatus: updatedStatus,
        }),
      );
      await this.sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiator, transactionId);
    }
  }
}
