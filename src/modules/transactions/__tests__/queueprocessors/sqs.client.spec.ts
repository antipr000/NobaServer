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
import { NODE_ENV_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "src/config/ConfigurationUtils";
import { TestConfigModule } from "src/core/utils/AppConfigModule";
import { getTestWinstonModule } from "src/core/utils/WinstonModule";
import { TransactionQueueName } from "../../queueprocessors/QueuesMeta";
import { SqsClient } from "../../queueprocessors/sqs.client";

describe("FiatTransactionInitiator", () => {
  jest.setTimeout(10000);

  let sqsClient: SqsClient;

  beforeEach(async () => {
    process.env[NODE_ENV_CONFIG_KEY] = "development";

    const environmentVariables = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync(environmentVariables), getTestWinstonModule()],
      providers: [SqsClient],
    }).compile();

    sqsClient = app.get<SqsClient>(SqsClient);
  });

  afterEach(async () => {
    MockSqsConsumer.reset();
    MockSqsProducer.reset();
  });

  it("should enqueue message ", async () => {
    // TODO(#): Change the mocks for accepting more than 1 producers.
  });
});
