import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionQueueName } from "./QueuesMeta";
import { TransactionService } from "../transaction.service";
import { SqsClient } from "./sqs.client";
import { MessageProcessor } from "./message.processor";
import { ConsumerService } from "../../consumer/consumer.service";

export class TransactionCompletedProcessor extends MessageProcessor {

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
  ) {
    super(logger, transactionRepo, sqsClient, consumerService, transactionService, TransactionQueueName.CryptoTransactionCompleted);
  }

  async processMessage(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.CRYPTO_OUTGOING_COMPLETED) {
      this.logger.info(`Transaction is not initiated yet, skipping ${status}`);
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
