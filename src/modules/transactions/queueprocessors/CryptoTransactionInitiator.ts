import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "sqs-consumer";
import { ConsumerService } from "../../consumer/consumer.service";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";
import { Transaction, transactionJoiValidationKeys } from "../domain/Transaction";
import { CryptoTransactionRequestResultStatus, TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { getTransactionQueueProducers, TransactionQueueName } from "./QueuesMeta";

@Injectable()
export class CryptoTransactionStatusInitiator {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  @Inject()
  private readonly transactionService: TransactionService;

  @Inject()
  private readonly consumerService: ConsumerService;

  constructor() {
    this.init();
  }

  async init() {
    const app = Consumer.create({
      queueUrl: environmentDependentQueueUrl(TransactionQueueName.FiatTransactionCompleted),
      handleMessage: async message => {
        //TODO add timeout
        this.initiateCryptoTransaction(message.Body);
      },
    });

    app.on("error", err => {
      this.logger.error(`Error while checking transaction status ${err}`);
    });

    app.on("processing_error", err => {
      this.logger.error(`Processing Error while checking transaction status ${err}`);
    });

    app.start();
  }

  async initiateCryptoTransaction(transactionId: string) {
    this.logger.info("Processing transaction", transactionId);
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.FIAT_INCOMING_COMPLETED) {
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
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIAING,
      }),
    );

    const consumer = await this.consumerService.getConsumer(transaction.props.userId);

    // crypto transaction here
    const result = await this.transactionService.initiateCryptoTransaction(consumer, transaction);
    if (result.status === CryptoTransactionRequestResultStatus.INITIATED) {
      transaction.props.cryptoTransactionId = result.tradeID;
      transaction.props.exchangeRate = result.exchangeRate;
      transaction.props.nobaTransferID = result.nobaTransferID;
      transaction.props.tradeQuoteID = result.quoteID;
      transaction.props.transactionStatus = TransactionStatus.CRYPTO_OUTGOING_INITIATED;

      this.logger.info(`Crypto Transaction for Noba Transaction ${transactionId} initiated with id ${result.tradeID}`);
    }

    if (
      result.status === CryptoTransactionRequestResultStatus.FAILED ||
      result.status === CryptoTransactionRequestResultStatus.OUT_OF_BALANCE
    ) {
      this.logger.info(
        `Crypto Transaction for Noba transaction ${transactionId} failed, reason: ${result.diagnosisMessage}`,
      );
      transaction.props.transactionStatus = TransactionStatus.CRYPTO_OUTGOING_FAILED;
    }

    if (result.status === CryptoTransactionRequestResultStatus.OUT_OF_BALANCE) {
      //TODO alert here !!
      this.logger.info("Noba Crypto balance is low, raising alert");
    }

    // crypto transaction ends here

    transaction = await this.transactionRepo.updateTransaction(Transaction.createTransaction({ ...transaction.props }));

    //Move to initiated crypto queue, poller will take delay as it's scheduled so we move it to the target queue directly from here
    if (transaction.props.transactionStatus == TransactionStatus.CRYPTO_OUTGOING_INITIATED) {
      getTransactionQueueProducers()[TransactionQueueName.CryptoTransactionInitiated].send({
        id: transactionId,
        body: transactionId,
      });
    }
  }
}
