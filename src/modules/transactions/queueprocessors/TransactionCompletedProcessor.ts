import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionQueueName } from "./QueuesMeta";
import { MessageProcessor, QueueProcessorHelper } from "./QueueProcessorHelper";

@Injectable()
export class TransactionCompletedProcessor implements MessageProcessor {
  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  private queueProcessorHelper: QueueProcessorHelper;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) readonly logger: Logger) {
    this.queueProcessorHelper = new QueueProcessorHelper(this.logger);
    this.init();
  }

  async init() {
    const app = this.queueProcessorHelper.createConsumer(TransactionQueueName.CryptoTransactionCompleted, this);

    app.start();
  }

  async process(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.CRYPTO_OUTGOING_COMPLETED) {
      this.logger.info(
        `Transaction with status ${status} should not be in queue ${TransactionQueueName.CryptoTransactionCompleted}`,
      );
      return;
    }

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATING,
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
