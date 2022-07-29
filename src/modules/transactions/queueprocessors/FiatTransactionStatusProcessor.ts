import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "sqs-consumer";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";
import { ConsumerService } from "../../consumer/consumer.service";
import { FiatTransactionStatus } from "../../consumer/domain/Types";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionQueueName } from "./QueuesMeta";
import { MessageProcessor, QueueProcessorHelper } from "./QueueProcessorHelper";

@Injectable()
export class FiatTransactionStatusProcessor implements MessageProcessor {
  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  @Inject()
  private readonly consumerService: ConsumerService;

  private queueProcessorHelper: QueueProcessorHelper;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) readonly logger: Logger) {
    this.queueProcessorHelper = new QueueProcessorHelper(this.logger);
    this.init();
  }

  async init() {
    const app = this.queueProcessorHelper.createConsumer(TransactionQueueName.FiatTransactionInitiated, this);

    app.start();
  }

  async process(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.FIAT_INCOMING_INITIATED) {
      this.logger.info(`Transaction ${transactionId} is not in initiated state, skipping ${status}`);
      return;
    }

    let newStatus: TransactionStatus;
    // check transaction status here
    const paymentStatus = await this.consumerService.getFiatPaymentStatus(
      transaction.props.checkoutPaymentID,
      null, // TODO add payment method provider in the transaction itself
    );

    if (paymentStatus === FiatTransactionStatus.CAPTURED) {
      this.logger.info(
        `Transaction ${transactionId} is captured with paymentID ${transaction.props.checkoutPaymentID}, updating status to ${TransactionStatus.FIAT_INCOMING_COMPLETED}`,
      );
      newStatus = TransactionStatus.FIAT_INCOMING_COMPLETED; // update transaction status
    } else if (paymentStatus === FiatTransactionStatus.PENDING) {
      this.logger.info(
        `Transaction ${transactionId} is stilling Pending paymentID ${transaction.props.checkoutPaymentID}`,
      );
      transaction.setDBPollingTimeAfterNSeconds(5); //reprocess this transaction in 5 seconds
    } else if (paymentStatus === FiatTransactionStatus.FAILED) {
      this.logger.info(
        `Transaction ${transactionId} failed with paymentID ${transaction.props.checkoutPaymentID}, updating status to ${TransactionStatus.FIAT_INCOMING_FAILED}`,
      );
      await this.queueProcessorHelper.failure(
        TransactionStatus.FIAT_INCOMING_FAILED,
        "Need more details on the failure",
        transaction,
        this.transactionRepo,
      ); // TODO (#332) get details from exception thrown by getFiatPaymentStatus()
      return;
    }

    //save the new status in db
    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({ ...transaction.props, transactionStatus: newStatus }),
    );

    if (TransactionStatus.FIAT_INCOMING_COMPLETED === newStatus) {
      await this.queueProcessorHelper.enqueueTransaction(TransactionQueueName.FiatTransactionCompleted, transactionId);
    }
  }
}
