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
    @Inject("TransactionRepo") private readonly transactionRepo: ITransactionRepo,
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

    this.logger.debug(`Received ${transactionId} in 'OnChainPendingProcessor'.`);

    if (status != TransactionStatus.CRYPTO_OUTGOING_COMPLETED) {
      this.logger.info(
        `Transaction ${transactionId} is not in ${TransactionStatus.CRYPTO_OUTGOING_COMPLETED} status, skipping, current status: ${status}`,
      );
      return;
    }

    // No need to guard this with an intermediate Transaction state
    // as this processor is idempotent.
    const withdrawalResponse = await this.zerohashService.getWithdrawal(transaction.props.zhWithdrawalID);
    this.logger.debug("Withdrawal Response: " + JSON.stringify(withdrawalResponse));

    const onChainStatus = withdrawalResponse["message"][0]["on_chain_status"];
    if (onChainStatus === "PENDING") {
      // no-op
      // TODO(#): Update the transaction timestamp.
      return;
    }

    await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: TransactionStatus.COMPLETED,
      }),
    );

    // await this.queueProcessorHelper.enqueueTransaction(TransactionQueueName.TransactionCompleted, transactionId);
  }
}
