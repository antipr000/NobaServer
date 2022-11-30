import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PendingTransactionValidationStatus } from "../../consumer/domain/Types";
import { Logger } from "winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { TransactionStatus, TransactionQueueName, TransactionType } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { SqsClient } from "./sqs.client";
import { MessageProcessor } from "./message.processor";
import { LockService } from "../../../modules/common/lock.service";
import { TransactionSubmissionException } from "../exceptions/TransactionSubmissionException";

export class ValidatePendingTransactionProcessor extends MessageProcessor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
    lockService: LockService,
  ) {
    super(
      logger,
      transactionRepo,
      sqsClient,
      consumerService,
      transactionService,
      TransactionQueueName.PendingTransactionValidation,
      lockService,
    );
  }

  async processMessageInternal(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const consumer = await this.consumerService.getConsumer(transaction.props.userId);

    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.PENDING) {
      this.logger.info(`${transactionId}: Transaction is not in pending state, skipping, status: ${status}`);
      return;
    }

    try {
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
        transaction = await this.transactionRepo.updateTransactionStatus(
          transaction.props._id,
          updatedStatus,
          transaction.props,
        );

        // TODO: This type logic is not sustainable but necessary for now
        if (transaction.props.type === TransactionType.INTERNAL_WITHDRAWAL) {
          await this.sqsClient.enqueue(TransactionQueueName.InternalTransferInitiator, transactionId);
        } else {
          await this.sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiator, transactionId);
        }
      }
    } catch (e) {
      this.logger.error(`Error in ValidatePendingTransactionProcessor: ${JSON.stringify(e)}`);
      if (e instanceof TransactionSubmissionException) {
        await this.processFailure(
          TransactionStatus.VALIDATION_FAILED,
          e.reasonCode, // TODO (#332): Need more detail here - should throw exception from validatePendingTransaction with detailed reason
          transaction,
          e.reasonSummary,
        );
      } else {
        await this.processFailure(TransactionStatus.VALIDATION_FAILED, "Validation Failure", transaction, e.message);
      }
    }
    // This logic should be idempotent so we don't need to check whether we failed between here and transaction update
  }
}
