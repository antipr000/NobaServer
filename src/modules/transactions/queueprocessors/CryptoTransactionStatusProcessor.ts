import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Consumer } from "sqs-consumer";
import { ConsumerService } from "../../consumer/consumer.service";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";
import { Transaction } from "../domain/Transaction";
import { CryptoTransactionStatus, TransactionStatus } from "../domain/Types";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionService } from "../transaction.service";
import { TransactionQueueName } from "./QueuesMeta";
import { MessageProcessor, QueueProcessorHelper } from "./QueueProcessorHelper";

@Injectable()
export class CryptoTransactionStatusProcessor implements MessageProcessor {
  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  @Inject()
  private readonly transactionService: TransactionService;

  @Inject()
  private readonly consumerService: ConsumerService;

  private queueProcessorHelper: QueueProcessorHelper;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) readonly logger: Logger) {
    this.queueProcessorHelper = new QueueProcessorHelper(this.logger);
    this.init();
  }

  async init() {
    const app = this.queueProcessorHelper.createConsumer(TransactionQueueName.CryptoTransactionInitiated, this);

    app.start();
  }

  async process(transactionId: string) {
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.CRYPTO_OUTGOING_INITIATED) {
      this.logger.info(
        `Transaction with status ${status} should not be in queue ${TransactionQueueName.CryptoTransactionInitiated}`,
      );
      return;
    }

    let newStatus: TransactionStatus;
    try {
      const consumer = await this.consumerService.getConsumer(transaction.props.userId);
      // check transaction status here
      const cryptoRes = await this.transactionService.cryptoTransactionStatus(consumer, transaction);
      this.logger.info("Crypto status is " + cryptoRes.status);
      if (cryptoRes.status === CryptoTransactionStatus.COMPLETED) {
        if (!cryptoRes.onChainTransactionID) {
          // Wait for another poll cycle
          this.logger.info("Going another poll cycle to get on-chain ID");
          return;
        } else {
          this.logger.info(
            `Crypto transaction for Transaction ${transactionId} is completed with ID ${cryptoRes.onChainTransactionID}`,
          );
          transaction.props.blockchainTransactionId = cryptoRes.onChainTransactionID;
          newStatus = TransactionStatus.CRYPTO_OUTGOING_COMPLETED;
        }
      } else if (cryptoRes.status === CryptoTransactionStatus.INITIATED) {
        this.logger.info("Going another poll cycle to get on-chain ID");
        newStatus = TransactionStatus.CRYPTO_OUTGOING_PENDING;
      } else if (cryptoRes.status === CryptoTransactionStatus.FAILED) {
        this.logger.info(
          `Crypto transaction for Transaction ${transactionId} failed, crypto transaction id : ${transaction.props.cryptoTransactionId}`,
        );

        await this.queueProcessorHelper.failure(
          TransactionStatus.CRYPTO_OUTGOING_FAILED,
          "Failed to settle crypto transaction.", // TODO: Need more detail here - should throw exception from cryptoTransactionStatus with detailed reason
          transaction,
          this.transactionRepo,
        );
        return;
      }
    } catch (err) {
      this.logger.error("Caught exception in CryptoTransactionStatusProcessor. Moving to failed queue.", err);
      await this.queueProcessorHelper.failure(
        TransactionStatus.CRYPTO_OUTGOING_FAILED,
        "Failed to settle crypto transaction.", // TODO: Need more detail here - should throw exception from cryptoTransactionStatus with detailed reason
        transaction,
        this.transactionRepo,
      );
      return;
    }

    transaction = await this.transactionRepo.updateTransaction(
      Transaction.createTransaction({ ...transaction.props, transactionStatus: newStatus }),
    );

    //Move to completed queue, poller will take delay as it's scheduled so we move it to the target queue directly from here
    if (newStatus === TransactionStatus.CRYPTO_OUTGOING_COMPLETED) {
      // await this.queueProcessorHelper.enqueueTransaction(TransactionQueueName.TransactionCompleted, transactionId);
    } else if (newStatus === TransactionStatus.CRYPTO_OUTGOING_FAILED) {
      await this.queueProcessorHelper.enqueueTransaction(TransactionQueueName.TransactionFailed, transactionId);
    }
  }
}
