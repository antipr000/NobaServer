import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "sqs-consumer";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionQueueName } from "./QueuesMeta";

@Injectable()
export class TransactionCompletionProcessor {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  constructor() {
    this.init();
  }

  async init() {
    const app = Consumer.create({
      queueUrl: environmentDependentQueueUrl(TransactionQueueName.CryptoTransactionCompleted),
      handleMessage: async message => {
        console.log(message);
        this.processTransactionCompletion(message.Body);
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

  async processTransactionCompletion(transactionId: string) {
    this.logger.info("Processing transaction", transactionId);
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.CRYPTO_OUTGOING_COMPLETED) {
      this.logger.info(`Transaction is not initiated yet, skipping ${status}`);
      return;
    }

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIAING,
      }),
    );

    // notify users, send emails

    // -- notify users, send emails --

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: TransactionStatus.COMPLETED,
      }),
    );
  }
}
