import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "sqs-consumer";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { getTransactionQueueProducers, TransactionQueueName } from "./QueuesMeta";

@Injectable()
export class CryptoTransactionStatusProcessor {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  @Inject()
  private readonly transactionService: TransactionService;

  constructor() {
    this.init();
  }

  async init() {
    const app = Consumer.create({
      queueUrl: environmentDependentQueueUrl(TransactionQueueName.CryptoTransactionInitiated),
      handleMessage: async message => {
        console.log(message);
        this.checkCryptoTransactionStatus(message.Body);
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

  async checkCryptoTransactionStatus(transactionId: string) {
    this.logger.info("Processing transaction", transactionId);
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.CRYPTO_OUTGOING_INITIATED) {
      this.logger.info(`Transaction is not initiated yet, skipping ${status}`);
      return;
    }

    // check transaction status here
    const cryptoRes = await this.transactionService.cryptoTransactionStatus(transaction);
    if (cryptoRes.status === "COMPLETED") {
      this.logger.info(`Crypto transaction for Transaction ${transactionId} is completed`);
      transaction.props.transactionStatus = TransactionStatus.CRYPTO_OUTGOING_COMPLETED;
    }
    if (cryptoRes.status === "FAILED") {
      this.logger.info(
        `Crypto transaction for Transaction ${transactionId} failed, crypto transaction id : ${transaction.props.cryptoTransactionId}`,
      );
      transaction.props.transactionStatus = TransactionStatus.CRYPTO_OUTGOING_FAILED;
    }

    transaction = await this.transactionRepo.updateTransaction(Transaction.createTransaction({ ...transaction.props }));

    //Move to completed queue, poller will take delay as it's scheduled so we move it to the target queue directly from here
    if (transaction.props.transactionStatus === TransactionStatus.CRYPTO_OUTGOING_COMPLETED) {
      getTransactionQueueProducers()[TransactionQueueName.TransactionCompleted].send({
        id: transactionId,
        body: transactionId,
      });
    }
  }
}
