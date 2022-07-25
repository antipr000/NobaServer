import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "sqs-consumer";
import { Producer } from "sqs-producer";
import { PendingTransactionValidationStatus } from "../../consumer/domain/Types";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";
import { ConsumerService } from "../../consumer/consumer.service";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { getTransactionQueueProducers, TransactionQueueName } from "./QueuesMeta";

@Injectable()
export class ValidatePendingTransactionProcessor {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  @Inject()
  private readonly consumerService: ConsumerService;

  @Inject()
  private readonly transactionService: TransactionService;

  private readonly queueProducers: Record<TransactionQueueName, Producer>;

  constructor() {
    this.queueProducers = getTransactionQueueProducers();
    this.init();
  }

  async init() {
    const app = Consumer.create({
      queueUrl: environmentDependentQueueUrl(TransactionQueueName.PendingTransactionValidation),
      handleMessage: async message => {
        console.log(message);
        this.initiatePendingTransaction(message.Body);
      },
    });

    app.on("error", err => {
      this.logger.error(`Error while initiating transaction ${err}`);
    });

    app.on("processing_error", err => {
      this.logger.error(`Processing Error while initiating transaction ${err}`);
    });

    app.start();
  }

  async initiatePendingTransaction(transactionId: string) {
    this.logger.info("Initiating pending transaction", transactionId);
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
      this.queueProducers[TransactionQueueName.TransactionFailed].send({ id: transactionId, body: transactionId });
    } else {
      //Move to initiated queue, db poller will take delay to put it to queue as it's scheduled so we move it to the target queue directly from here
      this.queueProducers[TransactionQueueName.FiatTransactionInitiator].send({
        id: transactionId,
        body: transactionId,
      });
    }
  }
}
