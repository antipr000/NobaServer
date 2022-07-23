import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "sqs-consumer";
import { Producer } from "sqs-producer";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";
import { ConsumerService } from "../../consumer/consumer.service";
import { Transaction } from "../domain/Transaction";
import { TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { getTransactionQueueProducers, TransactionQueueName } from "./QueuesMeta";

@Injectable()
export class FiatTransactionInitiator {
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
      queueUrl: environmentDependentQueueUrl(TransactionQueueName.FiatTransactionInitiator),
      handleMessage: async message => {
        console.log(message);
        this.intiateFiatTransaction(message.Body);
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

  async intiateFiatTransaction(transactionId: string) {
    this.logger.info("Processing transaction", transactionId);
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;

    if (status != TransactionStatus.PENDING && status != TransactionStatus.FIAT_INCOMING_INITIATING) {
      this.logger.info(`Transaction ${transactionId} is not in pending state, skipping, status: ${status}`);
      return;
    }

    let checkoutPaymentID: string;
    // If status is already TransactionStatus.FIAT_INCOMING_INITIATING, then we failed this step before. Query checkout to see if our call
    // succeeded and if so, skip checkout and continue with updating transaction status & enqueueing.
    if (status == TransactionStatus.FIAT_INCOMING_INITIATING) {
      // TDOO(#310): query checkout based on transaction.props._id to see if we already have a payment id
    } else {
      //before initiating the transaction we want to update the status so that if the initiator fails we don't execute this block again and manually resolve the failure depending on the type
      transaction = await this.transactionRepo.updateTransaction(
        Transaction.createTransaction({
          ...transaction.props,
          transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATING,
        }),
      );
    }

    // TODO(#310) This is happening before we've called the ZH logic to calculate the true fiat value! We need to call
    // ZH before we even get here!
    if (checkoutPaymentID == undefined) {
      // Fiat Transaction implementation here
      const payment = await this.consumerService.requestCheckoutPayment(
        transaction.props.paymentMethodID,
        transaction.props.leg1Amount,
        transaction.props.leg1,
        transaction.props._id,
      );

      checkoutPaymentID = payment["id"];
    }

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        checkoutPaymentID: checkoutPaymentID,
      }),
    );

    //Move to initiated queue, db poller will take delay to put it to queue as it's scheduled so we move it to the target queue directly from here
    this.queueProducers[TransactionQueueName.FiatTransactionInitated].send({ id: transactionId, body: transactionId });
  }
}
