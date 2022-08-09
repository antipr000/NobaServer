import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { FiatTransactionStatus } from "../../consumer/domain/Types";
import { Transaction } from "../domain/Transaction";
import { TransactionQueueName, TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { SqsClient } from "./sqs.client";
import { MessageProcessor } from "./message.processor";
import { LockService } from "../../../modules/common/lock.service";

export class FiatTransactionStatusProcessor extends MessageProcessor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) logger: Logger,
    @Inject("TransactionRepo") transactionRepo: ITransactionRepo,
    sqsClient: SqsClient,
    consumerService: ConsumerService,
    transactionService: TransactionService,
    lockService: LockService,
  ) {
    super(
      logger,
      transactionRepo,
      sqsClient,
      consumerService,
      transactionService,
      TransactionQueueName.FiatTransactionInitiated,
      lockService,
    );
  }

  async processMessageInternal(transactionId: string) {
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

    if (paymentStatus === FiatTransactionStatus.CAPTURED || paymentStatus === FiatTransactionStatus.AUTHORIZED) {
      this.logger.info(
        `Transaction ${transactionId} is ${paymentStatus} with paymentID ${transaction.props.checkoutPaymentID}, updating status to ${TransactionStatus.FIAT_INCOMING_COMPLETED}`,
      );
      newStatus = TransactionStatus.FIAT_INCOMING_COMPLETED; // update transaction status
    } else if (paymentStatus === FiatTransactionStatus.PENDING) {
      this.logger.info(
        `Transaction ${transactionId} is stilling Pending paymentID ${transaction.props.checkoutPaymentID}`,
      );
      return;
    } else if (paymentStatus === FiatTransactionStatus.FAILED) {
      this.logger.info(
        `Transaction ${transactionId} failed with paymentID ${transaction.props.checkoutPaymentID}, updating status to ${TransactionStatus.FIAT_INCOMING_FAILED}`,
      );
      await this.processFailure(
        TransactionStatus.FIAT_INCOMING_FAILED,
        "Need more details on the failure",
        transaction,
      ); // TODO (#332) get details from exception thrown by getFiatPaymentStatus()
      return;
    } else {
      // Unknown error. So, retry again after sometime (DBPoller will poll and retry).
      // TODO(#): Add limit on retry.
      return;
    }

    //save the new status in db
    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({ ...transaction.props, transactionStatus: newStatus }),
    );

    //Move to completed queue if the transaction is completed so that we can process the next step quickly, we could just wait for the poller cron to put in this queue but poller will take delay as it's scheduled so we move it to the target queue directly from here
    if (newStatus === TransactionStatus.FIAT_INCOMING_COMPLETED) {
      await this.sqsClient.enqueue(TransactionQueueName.FiatTransactionCompleted, transactionId);
    }
  }
}
