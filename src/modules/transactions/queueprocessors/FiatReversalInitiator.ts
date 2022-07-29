import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "sqs-consumer";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionQueueName } from "./QueuesMeta";
import { MessageProcessor, QueueProcessorHelper } from "./QueueProcessorHelper";

@Injectable()
export class FiatReversalInitiator implements MessageProcessor {
  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  private queueProcessorHelper: QueueProcessorHelper;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) readonly logger: Logger) {
    this.queueProcessorHelper = new QueueProcessorHelper(this.logger);
    //this.init();
  }

  async init() {
    const app = this.queueProcessorHelper.createConsumer(TransactionQueueName.FiatTransactionInitiated, this);

    app.start();
  }

  async process(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.FIAT_INCOMING_INITIATED) {
      this.logger.info(`Transaction is not initiated yet, skipping ${status}`);
      return;
    }

    // check transaction status here

    // check transaction status here

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      }),
    );

    //TODO Move to initiated queue, poller will take delay as it's scheduled so we move it to the target queue directly from here
  }
}
