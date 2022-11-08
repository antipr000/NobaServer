import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ConsumerService } from "../../consumer/consumer.service";
import { FiatTransactionStatus } from "../../consumer/domain/Types";
import { TransactionQueueName, TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { SqsClient } from "./sqs.client";
import { MessageProcessor } from "./message.processor";
import { LockService } from "../../../modules/common/lock.service";
import { PaymentMethodType } from "../../../modules/consumer/domain/PaymentMethod";

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
      this.logger.info(`${transactionId}: Transaction is not in initiated state, skipping ${status}`);
      return;
    }

    const consumer = await this.consumerService.getConsumer(transaction.props.userId);
    const paymentMethod = consumer.getPaymentMethodByID(transaction.props.fiatPaymentInfo.paymentMethodID);

    switch (paymentMethod.type) {
      case PaymentMethodType.ACH: {
        // Order of checks matter here.
        // If "failed" event comes before the "FiatTransactionStatusProcessor" proceeds
        // there is a chance to save the loss by stopping the transaction here.

        // Luckily, the response from Checkout comes before Crypto Transfer.
        // Because the transaction is stopped and there is no loss 'isSettled' will also be set.
        if (transaction.props.fiatPaymentInfo.isFailed) {
          transaction.props.fiatPaymentInfo.isCompleted = true;
          transaction.props.transactionStatus = TransactionStatus.FAILED;
        }
        // Approved by Checkout but not yet rejected.
        // Noba will take the risk and do the crypto transfers.
        else if (transaction.props.fiatPaymentInfo.isApproved) {
          transaction.props.transactionStatus = TransactionStatus.FIAT_INCOMING_COMPLETED;
        }
        // Wait for the webhook events.
        else {
          this.logger.info(`Transaction '${transactionId}' is still waiting on the ACH webhook events.`);
          return;
        }

        break;
      }
      case PaymentMethodType.CARD: {
        const paymentStatus = await this.consumerService.getFiatPaymentStatus(
          transaction.props.fiatPaymentInfo.paymentID,
          transaction.props.fiatPaymentInfo.paymentProvider,
        );
        // Payment is "CAPTURED" or "AUTHORISED", then we'll move forward with Crypto transfer.
        if (paymentStatus === FiatTransactionStatus.CAPTURED || paymentStatus === FiatTransactionStatus.AUTHORIZED) {
          transaction.props.fiatPaymentInfo.isApproved = true;
          transaction.props.fiatPaymentInfo.isCompleted = true;
          transaction.props.transactionStatus = TransactionStatus.FIAT_INCOMING_COMPLETED;
        }
        // If transaction status is still "PENDING", the poller will push this state again
        // and then we'll check the status again.
        else if (paymentStatus === FiatTransactionStatus.PENDING) {
          this.logger.info(`Transaction '${transactionId}' is still "PENDING" on CARD transfer.`);
          return;
        }
        // Transaction is "FAILED".
        // As "Noba" hasn't initiated the crypto transfer yet, there is no loss incurred and
        // hence the "FIAT Transaction" is considered to be "completed".
        else if (paymentStatus === FiatTransactionStatus.FAILED) {
          transaction.props.fiatPaymentInfo.isCompleted = true;
          transaction.props.transactionStatus = TransactionStatus.FAILED;
        } else {
          // Unknown error. So, retry again after sometime (DBPoller will poll and retry).
          // TODO: Add limit on retry.
          return;
        }

        break;
      }
      default: {
        this.logger.error(`PaymentMethod should be either CARD or ACH.`);
        return;
      }
    }

    transaction = await this.transactionRepo.updateTransactionStatus(
      transaction.props._id,
      transaction.props.transactionStatus,
      transaction.props,
    );

    switch (transaction.props.transactionStatus) {
      case TransactionStatus.FIAT_INCOMING_COMPLETED: {
        await this.sqsClient.enqueue(TransactionQueueName.FiatTransactionCompleted, transactionId);
        break;
      }
      case TransactionStatus.FAILED: {
        // TODO (#332) get details from exception thrown by getFiatPaymentStatus()
        await this.processFailure(
          TransactionStatus.FIAT_INCOMING_FAILED,
          "Need more details on the failure",
          transaction,
        );
        break;
      }
      default: {
        this.logger.error(
          `Transaction '${transactionId}' has an un-identified state '${transaction.props.transactionStatus}' after FiatTransactionStatusProcessor execution.`,
        );
      }
    }
  }
}
