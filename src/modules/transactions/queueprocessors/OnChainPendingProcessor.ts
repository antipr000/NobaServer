import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionQueueName } from "./QueuesMeta";
import { MessageProcessor, QueueProcessorHelper } from "./QueueProcessorHelper";
import { ZeroHashService } from "../zerohash.service";

@Injectable()
export class OnChainPendingProcessor implements MessageProcessor {
  private queueProcessorHelper: QueueProcessorHelper;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) readonly logger: Logger,
    private readonly zerohashService: ZeroHashService,
    @Inject("TransactionRepo") private readonly transactionRepo: ITransactionRepo
  ) {
    this.queueProcessorHelper = new QueueProcessorHelper(this.logger);
    this.init();
  }

  async init() {
    const app = this.queueProcessorHelper.createConsumer(TransactionQueueName.OnChainPendingTransaction, this);

    app.start();
  }

  async process(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.ON_CHAIN_PENDING) {
      this.logger.info(
        `Transaction ${transactionId} is not in ${TransactionStatus.ON_CHAIN_PENDING} status, skipping, current status: ${status}`,
      );
      return;
    }

    // No need to guard this with an intermediate Transaction state 
    // as this processor is idempotent.
    const withdrawlResponse = await this.zerohashService.getWithdrawal(transaction.props.zerohashWithdrawlID);
    const onChainStatus = withdrawlResponse["message"][0]["on_chain_status"]
    if (onChainStatus === "PENDING") {
      // no-op
      // TODO(#): Update the transaction timestamp.
      return;
    }

    await this.transactionRepo.updateTransaction(Transaction.createTransaction({
      ...transaction.props,
      transactionStatus: TransactionStatus.COMPLETED
    }));
  }
}
