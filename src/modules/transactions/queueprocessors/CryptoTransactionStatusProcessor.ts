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
import { getTransactionQueueProducers, TransactionQueueName } from "./QueuesMeta";

@Injectable()
export class CryptoTransactionStatusProcessor {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("TransactionRepo")
  private readonly transactionRepo: ITransactionRepo;

  @Inject()
  private readonly transactionService: TransactionService;

  @Inject()
  private readonly consumerService: ConsumerService;

  constructor() {
    this.init();
  }

  async init() {
    const app = Consumer.create({
      queueUrl: environmentDependentQueueUrl(TransactionQueueName.CryptoTransactionInitiated),
      handleMessage: async message => {
        console.log(message);
        this.checkCryptoTransactionStatus(message.Body);
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

  async checkCryptoTransactionStatus(transactionId: string) {
    this.logger.info("Processing transaction", transactionId);
    let transaction = await this.transactionRepo.getTransaction(transactionId);
    const status = transaction.props.transactionStatus;
    if (status != TransactionStatus.CRYPTO_OUTGOING_INITIATED) {
      this.logger.info(`Transaction is not initiated yet, skipping ${status}`);
      return;
    }

    try {
      const consumer = await this.consumerService.getConsumer(transaction.props.userId);
      // check transaction status here
      const cryptoRes = await this.transactionService.cryptoTransactionStatus(consumer, transaction);
      console.log(`CryptoRes: ${JSON.stringify(cryptoRes)}`);
      if (cryptoRes.status === CryptoTransactionStatus.COMPLETED) {
        this.logger.info(
          `Crypto transaction for Transaction ${transactionId} is completed with ID ${cryptoRes.onChainTransactionID}`,
        );
        transaction.props.transactionStatus = TransactionStatus.CRYPTO_OUTGOING_COMPLETED;
        if (cryptoRes.onChainTransactionID != null) {
          // TODO(#310) - need to poll for this
          transaction.props.blockchainTransactionId = cryptoRes.onChainTransactionID;
        }
      } else if (cryptoRes.status === CryptoTransactionStatus.INITIATED) {
        // TODO(#310) We need to poll and/or use websocket until we get an on-chain transaction ID
        transaction.props.transactionStatus = TransactionStatus.CRYPTO_OUTGOING_PENDING;
      } else if (cryptoRes.status === CryptoTransactionStatus.FAILED) {
        this.logger.info(
          `Crypto transaction for Transaction ${transactionId} failed, crypto transaction id : ${transaction.props.cryptoTransactionId}`,
        );
        transaction.props.transactionStatus = TransactionStatus.CRYPTO_OUTGOING_FAILED;
      }
    } catch (e) {
      this.logger.error("Caught exception in CryptoTransactionStatusProcessor. Moving to failed queue.", e);
      transaction.props.transactionStatus = TransactionStatus.CRYPTO_OUTGOING_FAILED;
    }

    transaction = await this.transactionRepo.updateTransaction(Transaction.createTransaction({ ...transaction.props }));

    //Move to completed queue, poller will take delay as it's scheduled so we move it to the target queue directly from here
    if (transaction.props.transactionStatus === TransactionStatus.CRYPTO_OUTGOING_COMPLETED) {
      getTransactionQueueProducers()[TransactionQueueName.TransactionCompleted].send({
        id: transactionId,
        body: transactionId,
      });
    } else if (transaction.props.transactionStatus === TransactionStatus.CRYPTO_OUTGOING_FAILED) {
      getTransactionQueueProducers()[TransactionQueueName.TransactionFailed].send({
        id: transactionId,
        body: transactionId,
      });
    }
  }
}
