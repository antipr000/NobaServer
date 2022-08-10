import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { Logger } from "winston";
import { Transaction } from "../domain/Transaction";
import { CryptoTransactionRequestResultStatus, TransactionQueueName, TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { SqsClient } from "./sqs.client";
import { MessageProcessor } from "./message.processor";
import { LockService } from "../../../modules/common/lock.service";

export class CryptoTransactionInitiator extends MessageProcessor {
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
      TransactionQueueName.FiatTransactionCompleted,
      lockService,
    );
  }

  async processMessageInternal(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.FIAT_INCOMING_COMPLETED && status != TransactionStatus.CRYPTO_OUTGOING_INITIATING) {
      this.logger.info(
        `Transaction ${transactionId} is not in ${TransactionStatus.FIAT_INCOMING_COMPLETED} status, skipping, current status: ${status}`,
      );
      return;
    }

    // updating transaction status so that this transaction cannot be reprocessed to purchase crypto if this attempt
    // fails for any possible reason as there is no queue processor to pick from this state other than failure processor
    transaction = await this.transactionRepo.updateTransactionStatus(
      transaction.props._id,
      TransactionStatus.CRYPTO_OUTGOING_INITIATING,
      {}
    );

    const consumer = await this.consumerService.getConsumer(transaction.props.userId);
    let newStatus: TransactionStatus;

    // crypto transaction here
    const result = await this.transactionService.initiateCryptoTransaction(consumer, transaction);
    if (result.status === CryptoTransactionRequestResultStatus.INITIATED) {
      transaction.props.cryptoTransactionId = result.tradeID;
      transaction.props.exchangeRate = result.exchangeRate;
      transaction.props.nobaTransferID = result.nobaTransferID;
      transaction.props.tradeQuoteID = result.quoteID;
      newStatus = TransactionStatus.CRYPTO_OUTGOING_INITIATED;

      this.logger.info(`Crypto Transaction for Noba Transaction ${transactionId} initiated with id ${result.tradeID}`);
    } else if (
      result.status === CryptoTransactionRequestResultStatus.FAILED ||
      result.status === CryptoTransactionRequestResultStatus.OUT_OF_BALANCE
    ) {
      this.logger.info(
        `Crypto Transaction for Noba transaction ${transactionId} failed, reason: ${result.diagnosisMessage}`,
      );

      if (result.status === CryptoTransactionRequestResultStatus.OUT_OF_BALANCE) {
        //TODO alert here !!
        this.logger.info("Noba Crypto balance is low, raising alert");
      }

      const statusReason =
        result.status === CryptoTransactionRequestResultStatus.OUT_OF_BALANCE ? "Out of balance." : "General failure."; // TODO (#332): Improve error responses
      await this.processFailure(
        TransactionStatus.CRYPTO_OUTGOING_FAILED,
        statusReason, // TODO: Need more detail here - should throw exception from validatePendingTransaction with detailed reason
        transaction,
      );
      return;
    } else {
      // TODO(#): Define the behaviour for other kind of statuses
    }

    // crypto transaction ends here

    transaction = await this.transactionRepo.updateTransactionStatus(
      transaction.props._id,
      newStatus,
      transaction.props
    );

    //Move to initiated crypto queue, poller will take delay as it's scheduled so we move it to the target queue directly from here
    if (newStatus === TransactionStatus.CRYPTO_OUTGOING_INITIATED) {
      await this.sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, transactionId);
    }
  }
}
