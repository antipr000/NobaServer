import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "sqs-consumer";
import { ConsumerService } from "../../consumer/consumer.service";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";
import { Transaction } from "../domain/Transaction";
import { CryptoTransactionRequestResultStatus, TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { TransactionQueueName } from "./QueuesMeta";
import { MessageProcessor, QueueProcessorHelper } from "./QueueProcessorHelper";

@Injectable()
export class CryptoTransactionInitiator implements MessageProcessor {
  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  @Inject()
  private readonly transactionService: TransactionService;

  @Inject()
  private readonly consumerService: ConsumerService;

  private queueProcessorHelper: QueueProcessorHelper;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) readonly logger: Logger) {
    this.queueProcessorHelper = new QueueProcessorHelper(this.logger);
    this.init();
  }

  async init() {
    const app = this.queueProcessorHelper.createConsumer(TransactionQueueName.FiatTransactionCompleted, this);

    app.start();
  }

  async process(transactionId: string) {
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
    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATING,
      }),
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
    }

    if (
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

      await this.queueProcessorHelper.failure(
        TransactionStatus.CRYPTO_OUTGOING_FAILED,
        statusReason, // TODO: Need more detail here - should throw exception from validatePendingTransaction with detailed reason
        transaction,
        this.transactionRepo,
      );
      return;
    }

    // crypto transaction ends here

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({ ...transaction.props, transactionStatus: newStatus }),
    );

    //Move to initiated crypto queue, poller will take delay as it's scheduled so we move it to the target queue directly from here
    if (newStatus === TransactionStatus.CRYPTO_OUTGOING_INITIATED) {
      await this.queueProcessorHelper.enqueueTransaction(
        TransactionQueueName.CryptoTransactionInitiated,
        transactionId,
      );
    }
  }
}
