import { SQS } from "aws-sdk";
import { MessageBodyAttributeMap } from "aws-sdk/clients/sqs";
import { AppEnvironment, getEnvironmentName } from "../../../config/ConfigurationUtils";
import { TransactionQueueName } from "./QueuesMeta";
import * as os from "os";
import { Producer } from "sqs-producer";
import { Consumer } from "sqs-consumer";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Inject } from "@nestjs/common";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";
import { Transaction, TransactionEvent } from "../domain/Transaction";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { TransactionStatus } from "../domain/Types";

export interface MessageProcessor {
  process(transactionId: string): void;
}

export class QueueProcessorHelper {
  private static readonly SELECTOR_ATTRIBUTE = "hostname";
  private static readonly queueProducers = new Map<TransactionQueueName, Producer>();

  //TODO(#310) figure out why winston doesn't work

  constructor(private logger: Logger) {
    if (Object.keys(QueueProcessorHelper.queueProducers).length == 0) {
      this.getTransactionQueueProducers();
    }
  }

  async enqueueTransaction(queueName: string, transactionId: string): Promise<any> {
    this.logger.info(`${transactionId}   ====>   ${queueName}`);
    await QueueProcessorHelper.queueProducers[queueName].send({
      messageAttributes: this.getMessageAttributeHeaders(),
      id: transactionId,
      body: transactionId,
      delaySeconds: 0,
    });
  }

  private getTransactionQueueProducers = (): void => {
    Object.values(TransactionQueueName).forEach(queueName => {
      this.logger.info(`Creating queue producer for ${queueName}`);
      QueueProcessorHelper.queueProducers[queueName] = new Producer({
        queueUrl: environmentDependentQueueUrl(queueName),
      });
    });
  };

  private shouldProcessMessage(message: SQS.Message): boolean {
    if (getEnvironmentName() === AppEnvironment.DEV || getEnvironmentName() === AppEnvironment.E2E_TEST) {
      // Confirm that the producer's hostname is in the message headers
      const hostname = message.MessageAttributes[QueueProcessorHelper.SELECTOR_ATTRIBUTE]["StringValue"];
      if (hostname !== os.hostname()) {
        this.logger.info(`Skipping message for ${hostname}`);
        return false;
      } // else fall through to return true
    }

    return true;
  }

  createConsumer(
    queueName: string,
    messageProcessor: MessageProcessor,
    errorHandler?: Function,
    processingErrorHandler?: Function,
  ): Consumer {
    const consumer = Consumer.create({
      messageAttributeNames: [QueueProcessorHelper.SELECTOR_ATTRIBUTE],
      queueUrl: environmentDependentQueueUrl(queueName),
      visibilityTimeout: 0,
      handleMessage: async message => {
        if (this.shouldProcessMessage(message)) {
          this.logger.info(`${message.Body} [${messageProcessor.constructor.name}] `);
          return messageProcessor.process(message.Body);
        }
      },
    });

    consumer.on("error", err => {
      errorHandler ? errorHandler(err) : this.logger.info(`Error while handling transaction ${err}`);
    });

    consumer.on("message_received", message => {
      this.logger.info(`${message.Body} dequeued from ${queueName}`);
    });

    consumer.on("message_processed", message => {
      this.logger.info(`${message.Body} finished from ${queueName}`);
    });

    consumer.on("timeout_error", err => {
      this.logger.info(`Timeout from queue: ${err.message}`);
    });

    consumer.on("empty", () => {
      this.logger.debug(`${queueName} is empty!`);
    });

    consumer.on("processing_error", err => {
      processingErrorHandler
        ? processingErrorHandler(err)
        : this.logger.info(`Processing Error while handling transaction ${err}`);
    });

    return consumer;
  }

  // Populate message attributes with hostname so we can ensure cross-processing between dev workstations
  getMessageAttributeHeaders(): MessageBodyAttributeMap {
    if (getEnvironmentName() === AppEnvironment.DEV || getEnvironmentName() === AppEnvironment.E2E_TEST) {
      return {
        hostname: { DataType: "String", StringValue: os.hostname() },
      };
    }

    return null;
  }

  // TODO (#310) move transactionRepo to a class variable
  async failure(
    status: TransactionStatus,
    reason: string,
    transaction: Transaction,
    transactionRepo: ITransactionRepo,
  ) {
    const existingExceptions = transaction.props.transactionExceptions;
    const error: TransactionEvent = { timestamp: new Date(), message: reason, details: reason }; // TODO (#332) Improve population of details (internal details, not to be viewed by consumer)

    await transactionRepo.updateTransaction(
      Transaction.createTransaction({
        ...transaction.props,
        transactionStatus: status,
        transactionExceptions: [...existingExceptions, error],
      }),
    );
    await this.enqueueTransaction(TransactionQueueName.TransactionFailed, transaction.props._id);
  }
}
