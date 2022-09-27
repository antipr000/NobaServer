class MockSqsProducer {
  public static producedMessages: Array<any> = [];

  static reset() {
    MockSqsProducer.producedMessages = [];
  }

  constructor(public readonly constructedWith: any) {
    // MockSqsProducer.producedMessages = [];
  }

  send(message: any) {
    MockSqsProducer.producedMessages.push(message);
  }
}

class MockSqsConsumer {
  public static intializers: Array<any> = [];
  public static onCalls: Array<any> = [];
  public static startCallsCount = 0;

  static reset() {
    MockSqsConsumer.intializers = [];
    MockSqsConsumer.onCalls = [];
    MockSqsConsumer.startCallsCount = 0;
  }

  static create(initializer: any) {
    MockSqsConsumer.intializers.push(initializer);
    return new MockSqsConsumer();
  }

  on(type: string, callback) {
    MockSqsConsumer.onCalls.push({
      type: type,
      callback: callback,
    });
  }

  start() {
    MockSqsConsumer.startCallsCount++;
  }
}

jest.mock("sqs-producer", () => {
  return {
    Producer: MockSqsProducer,
  };
});

jest.mock("sqs-consumer", () => {
  return {
    Consumer: MockSqsConsumer,
  };
});

import { Test, TestingModule } from "@nestjs/testing";
import { NODE_ENV_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { SqsClient } from "../../queueprocessors/sqs.client";
import { TransactionQueueName } from "../../domain/Types";
import os from "os";
import { MessageProcessor } from "../../queueprocessors/message.processor";
import { getMockMessageProcessorWithDefaults } from "../../mocks/mock.message.processor";
import { MessageBodyAttributeMap } from "aws-sdk/clients/sqs";

describe("FiatTransactionInitiator", () => {
  jest.setTimeout(10000);

  let sqsClient: SqsClient;
  let messageProcessor: MessageProcessor;
  let messageAttributes: MessageBodyAttributeMap;

  describe("Dev environment tests", () => {
    beforeEach(async () => {
      process.env[NODE_ENV_CONFIG_KEY] = "development";
      messageProcessor = getMockMessageProcessorWithDefaults();

      const environmentVariables = {
        [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      };

      const app: TestingModule = await Test.createTestingModule({
        imports: [await TestConfigModule.registerAsync(environmentVariables), getTestWinstonModule()],
        providers: [SqsClient],
      }).compile();

      sqsClient = app.get<SqsClient>(SqsClient);
      messageAttributes = {
        hostname: { DataType: "String", StringValue: os.hostname() },
      };
    });

    afterEach(async () => {
      MockSqsConsumer.reset();
      MockSqsProducer.reset();
    });

    it("should enqueue message ", async () => {
      // TODO(#): Change the mocks for accepting more than 1 producers.
      const transactionID = "transaction-1";
      expect(MockSqsProducer.producedMessages.length).toBe(0);
      sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transactionID);
      expect(MockSqsProducer.producedMessages.length).toBe(1);
      expect(MockSqsProducer.producedMessages[0]).toStrictEqual({
        id: transactionID,
        body: transactionID,
        messageAttributes: messageAttributes,
      });
    });

    it("should create a new consumer", () => {
      expect(MockSqsConsumer.intializers.length).toBe(0);
      sqsClient.subscribeToQueue(TransactionQueueName.FiatTransactionInitiator, messageProcessor);
      expect(MockSqsConsumer.intializers.length).toBe(1);
    });

    it("handleMessage should throw error if hostnames doesn't match", async () => {
      sqsClient.subscribeToQueue(TransactionQueueName.FiatTransactionInitiator, messageProcessor);
      expect(MockSqsConsumer.intializers.length).toBe(1);

      try {
        await MockSqsConsumer.intializers[0].handleMessage({
          id: "fake-transaction",
          body: "fake-transaction",
          MessageAttributes: {
            hostname: { DataType: "String", StringValue: "fake-hostname" },
          },
        });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe("This message doesn't belong to current host!");
      }
    });

    it("Consumer should call processMessage when it receives a proper message", async () => {
      sqsClient.subscribeToQueue(TransactionQueueName.FiatTransactionInitiator, messageProcessor);
      expect(MockSqsConsumer.intializers.length).toBe(1);
      const mockProcessMessageImplementation = jest.fn();
      messageProcessor.processMessage = mockProcessMessageImplementation;

      await MockSqsConsumer.intializers[0].handleMessage({
        id: "fake-transaction",
        Body: "fake-transaction",
        MessageAttributes: messageAttributes,
      });

      expect(mockProcessMessageImplementation).toHaveBeenCalledTimes(1);
      expect(mockProcessMessageImplementation).toHaveBeenCalledWith("fake-transaction");
    });
  });

  describe("Non Dev environment tests", () => {
    beforeEach(async () => {
      process.env[NODE_ENV_CONFIG_KEY] = "staging";

      const environmentVariables = {
        [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      };

      const app: TestingModule = await Test.createTestingModule({
        imports: [await TestConfigModule.registerAsync(environmentVariables), getTestWinstonModule()],
        providers: [SqsClient],
      }).compile();

      sqsClient = app.get<SqsClient>(SqsClient);
      messageAttributes = null;
    });

    afterEach(async () => {
      MockSqsConsumer.reset();
      MockSqsProducer.reset();
    });

    it("should enqueue message ", async () => {
      const transactionID = "transaction-1";
      expect(MockSqsProducer.producedMessages.length).toBe(0);
      sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transactionID);
      expect(MockSqsProducer.producedMessages.length).toBe(1);
      expect(MockSqsProducer.producedMessages[0]).toStrictEqual({
        id: transactionID,
        body: transactionID,
        messageAttributes: messageAttributes,
      });
    });

    it("consumer should call processMessage even when messageAttribute is null", async () => {
      sqsClient.subscribeToQueue(TransactionQueueName.FiatTransactionInitiator, messageProcessor);
      expect(MockSqsConsumer.intializers.length).toBe(1);
      const mockProcessMessageImplementation = jest.fn();
      messageProcessor.processMessage = mockProcessMessageImplementation;

      await MockSqsConsumer.intializers[0].handleMessage({
        id: "fake-transaction",
        Body: "fake-transaction",
        MessageAttributes: messageAttributes,
      });

      expect(mockProcessMessageImplementation).toHaveBeenCalledTimes(1);
      expect(mockProcessMessageImplementation).toHaveBeenCalledWith("fake-transaction");
    });
  });
});
