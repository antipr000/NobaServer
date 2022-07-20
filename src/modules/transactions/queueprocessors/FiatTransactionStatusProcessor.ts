import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "sqs-consumer";
import { Producer } from "sqs-producer";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/SqsUtils";
import { ConsumerService } from "../../consumer/consumer.service";
import { FiatTransactionStatus } from "../../consumer/domain/Types";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { getTransactionQueueProducers, TransactionQueueName } from "./QueuesMeta";

@Injectable()
export class FiatTransactionStatusProcessor {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  @Inject()
  private readonly consumerService: ConsumerService;

  private readonly queueProducers: Record<TransactionQueueName, Producer>;

  constructor() {
    this.queueProducers = getTransactionQueueProducers();
    this.init();
  }

  async init() {
    const app = Consumer.create({
      queueUrl: environmentDependentQueueUrl(TransactionQueueName.FiatTransactionInitated),
      handleMessage: async message => {
        console.log(message);
        this.checkFiatTransactionStatus(message.Body);
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

  async checkFiatTransactionStatus(transactionId: string) {
    this.logger.info("Processing transaction", transactionId);
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.FIAT_INCOMING_INITIATED) {
      this.logger.info(`Transaction ${transactionId} is not in initiated state, skipping ${status}`);
      return;
    }

    // check transaction status here
    const paymentStatus = await this.consumerService.getFiatPaymentStatus(
      transaction.props.checkoutPaymentID,
      null, // TODO add payment method provider in the transaction itself
    );

    if (paymentStatus === FiatTransactionStatus.CAPTURED) {
      this.logger.info(
        `Transaction ${transactionId} is captured with paymentID ${transaction.props.checkoutPaymentID}, updating status to ${TransactionStatus.FIAT_INCOMING_COMPLETED}`,
      );
      transaction.props.transactionStatus = TransactionStatus.FIAT_INCOMING_COMPLETED; // update transaction status
    }

    if (paymentStatus === FiatTransactionStatus.PENDING) {
      this.logger.info(
        `Transaction ${transactionId} is stilling Pending paymentID ${transaction.props.checkoutPaymentID}`,
      );
      transaction.setDBPollingTimeAfterNSeconds(5); //reprocess this transaction in 5 seconds
    }

    if (paymentStatus === FiatTransactionStatus.FAILED) {
      this.logger.info(
        `Transaction ${transactionId} failed with paymentID ${transaction.props.checkoutPaymentID}, updating status to ${TransactionStatus.FIAT_INCOMING_FAILED}`,
      );
      transaction.props.transactionStatus = TransactionStatus.FIAT_INCOMING_FAILED;
    }

    //save the new status in db
    transaction = await this.transactionRepo.updateTransaction(Transaction.createTransaction(transaction.props));

    //Move to completed queue if the transaction is completed so that we can process the next step quickly, we could just wait for the poller cron to put in this queue but poller will take delay as it's scheduled so we move it to the target queue directly from here
    if (TransactionStatus.COMPLETED === transaction.props.transactionStatus) {
      this.logger.info(`Transaction ${transactionId} is completed, sending to completed queue`);
      this.queueProducers[TransactionQueueName.FiatTransactionCompleted].send({
        id: transactionId,
        body: transactionId,
      });
    }
  }
}