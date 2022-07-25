import { SQS } from "aws-sdk";
import { MessageBodyAttributeMap } from "aws-sdk/clients/sqs";
import { AppEnvironment, getEnvironmentName } from "src/config/ConfigurationUtils";
import { getTransactionQueueProducers, TransactionQueueName } from "./QueuesMeta";
import * as os from "os";
import { Producer } from "sqs-producer";
import { Consumer } from "sqs-consumer";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Inject } from "@nestjs/common";
import { Logger } from "winston";
import { environmentDependentQueueUrl } from "src/infra/aws/services/CommonUtils";

export interface MessageProcessor {
  process(transactionId: string): void;
}

export class QueueProcessorHelper {
  private static readonly SELECTOR_ATTRIBUTE = "hostname";
  private readonly queueProducers: Record<TransactionQueueName, Producer>;
  @Inject(WINSTON_MODULE_PROVIDER)
  readonly logger: Logger;

  //TODO(#310) figure out why winston doesn't work

  constructor(logger: Logger) {
    this.queueProducers = getTransactionQueueProducers();
    this.logger = logger;
  }

  async enqueueTransaction(queueName: string, transactionId: string): Promise<any> {
    console.log(`${transactionId}   ====>   ${queueName}`);
    return await this.queueProducers[queueName].send({
      messageAttributes: this.getMessageAttributeHeaders(),
      id: transactionId,
      body: transactionId,
    });
  }

  shouldProcessMessage(message: SQS.Message): boolean {
    if (getEnvironmentName() === AppEnvironment.DEV || getEnvironmentName() === AppEnvironment.E2E_TEST) {
      // Confirm that the producer's hostname is in the message headers
      const hostname = message.MessageAttributes[QueueProcessorHelper.SELECTOR_ATTRIBUTE]["StringValue"];
      if (hostname !== os.hostname()) {
        console.log(`Skipping message for ${hostname}`);
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
    const app = Consumer.create({
      messageAttributeNames: [QueueProcessorHelper.SELECTOR_ATTRIBUTE],
      queueUrl: environmentDependentQueueUrl(queueName),
      handleMessage: async message => {
        if (this.shouldProcessMessage(message)) {
          console.log(`${message.Body} [${messageProcessor.constructor.name}] `);
          messageProcessor.process(message.Body);
        }
      },
    });

    app.on("error", err => {
      errorHandler ? errorHandler(err) : console.log(`Error while handling transaction ${err}`);
    });

    app.on("processing_error", err => {
      processingErrorHandler
        ? processingErrorHandler(err)
        : console.log(`Processing Error while handling transaction ${err}`);
    });

    return app;
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
}
