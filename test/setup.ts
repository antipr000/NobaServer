class MockSqsProducer {
  public static producedMessages: Array<any> = [];

  static reset() {
    MockSqsProducer.producedMessages = [];
  }

  constructor(public readonly constructedWith: any) {
    MockSqsProducer.producedMessages = [];
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

  constructor() {}

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

import { join } from "path";

// Note that these are the variables required for even "loading" the code inside "server.ts"
export const setUpEnvironmentVariablesToLoadTheSourceCode = (): number => {
  const port = 9000 + Math.floor(Math.random() * 2000);

  process.env.PORT = `${port}`;
  process.env.NODE_ENV = "e2e_test";
  process.env.CONFIGS_DIR = join(__dirname, "../appconfigs");
  process.env.SERVER_BASE_URL = `http://localhost:${port}`;

  return port;
};
