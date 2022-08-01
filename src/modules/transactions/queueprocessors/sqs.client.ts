import { SQS } from "aws-sdk";
import { MessageBodyAttributeMap } from "aws-sdk/clients/sqs";
import { AppEnvironment, getEnvironmentName } from "../../../config/ConfigurationUtils";
import { getTransactionQueueProducers, TransactionQueueName } from "./QueuesMeta";
import * as os from "os";
import { Producer } from "sqs-producer";
import { Consumer } from "sqs-consumer";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Inject, Injectable } from "@nestjs/common";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";
import { MessageProcessor } from "./message.processor";

@Injectable()
export class SqsClient {
  private static readonly SELECTOR_ATTRIBUTE = "hostname";
  private readonly queueProducers: Record<TransactionQueueName, Producer>;

  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    this.queueProducers = getTransactionQueueProducers();
  }

  async enqueue(queueName: string, transactionId: string): Promise<any> {
    this.logger.info(`Enqueuing transaction with ID '${transactionId}'  ==>  '${queueName}'`);

    return this.queueProducers[queueName].send({
      messageAttributes: this.getMessageAttributeHeaders(),
      id: transactionId,
      body: transactionId,
    });
  }

  subscribeToQueue(queueName: string, messageProcessor: MessageProcessor): Consumer {
    const app = Consumer.create({
      messageAttributeNames: [SqsClient.SELECTOR_ATTRIBUTE],
      queueUrl: environmentDependentQueueUrl(queueName),

      handleMessage: async message => {
        if (!this.shouldProcessMessage(message)) {
          throw Error("This message doesn't belong to current host!");
        }
        this.logger.info(`${message.Body} [${messageProcessor.constructor.name}]`);
        return messageProcessor.processMessage(message.Body);
      },
    });

    app.on("error", err => messageProcessor.subscriptionErrorHandler(err));
    app.on("processing_error", err => messageProcessor.processingErrorHandler(err));
    return app;
  }

  // Populate message attributes with hostname so we can ensure cross-processing between dev workstations
  private getMessageAttributeHeaders(): MessageBodyAttributeMap {
    if (getEnvironmentName() === AppEnvironment.DEV || getEnvironmentName() === AppEnvironment.E2E_TEST) {
      return {
        hostname: { DataType: "String", StringValue: os.hostname() },
      };
    }
    return null;
  }

  private shouldProcessMessage(message: SQS.Message): boolean {
    if (getEnvironmentName() !== AppEnvironment.DEV && getEnvironmentName() !== AppEnvironment.E2E_TEST) {
      return true;
    }

    // Confirm that the producer's hostname is in the message headers
    const hostname = message.MessageAttributes[SqsClient.SELECTOR_ATTRIBUTE]["StringValue"];
    if (hostname !== os.hostname()) {
      this.logger.info(`Skipping message for ${hostname}`);
      return false;
    }

    return true;
  }
}
