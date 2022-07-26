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
import { DBProvider } from "../../../../infraproviders/DBProvider";
import { getMockConsumerServiceWithDefaults } from "../../../consumer/mocks/mock.consumer.service";
import { instance, when } from "ts-mockito";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { FiatTransactionInitiator } from "../../queueprocessors/FiatTransactionInitiator";
import { ConsumerService } from "../../../consumer/consumer.service";
import {
  MONGO_CONFIG_KEY,
  MONGO_URI,
  NODE_ENV_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../../config/ConfigurationUtils";
import { TransactionQueueName } from "../../queueprocessors/QueuesMeta";
import { Transaction, TransactionProps } from "../../domain/Transaction";
import { TransactionStatus } from "../../domain/Types";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Collection } from "mongodb";
import { MongoDBTransactionRepo } from "../../repo/MongoDBTransactionRepo";
import mongoose from "mongoose";
import * as os from "os";

const getAllRecordsInTransactionCollection = async (
  transactionCollection: Collection,
): Promise<Array<TransactionProps>> => {
  const transactionDocumentCursor = transactionCollection.find({});
  const allRecords: TransactionProps[] = [];

  while (await transactionDocumentCursor.hasNext()) {
    const transactionDocument = await transactionDocumentCursor.next();

    allRecords.push({
      ...transactionDocument,
      _id: transactionDocument._id.toString(),
    } as TransactionProps);
  }

  return allRecords;
};

describe("FiatTransactionInitiator", () => {
  jest.setTimeout(10000);

  let consumerService: ConsumerService;
  let fiatTransactionInitiator: FiatTransactionInitiator;

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let transactionCollection: Collection;

  beforeEach(async () => {
    process.env[NODE_ENV_CONFIG_KEY] = "development";

    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    console.log("MongoMemoryServer running at: ", mongoUri);

    const environmentVariables = {
      [MONGO_CONFIG_KEY]: {
        [MONGO_URI]: mongoUri,
      },
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };

    MockSqsConsumer.reset();
    MockSqsProducer.reset();
    consumerService = getMockConsumerServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync(environmentVariables), getTestWinstonModule()],
      providers: [
        DBProvider,
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: "TransactionRepo",
          useClass: MongoDBTransactionRepo,
        },
        FiatTransactionInitiator,
      ],
    }).compile();

    fiatTransactionInitiator = app.get<FiatTransactionInitiator>(FiatTransactionInitiator);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    transactionCollection = mongoClient.db("").collection("transactions");
  });

  afterEach(async () => {
    MockSqsConsumer.reset();
    MockSqsProducer.reset();

    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should process the fiat transaction and put it in next queue", async () => {
    const initiatedPaymentId = "CCCCCCCCCC";
    const transaction: Transaction = Transaction.createTransaction({
      _id: "1111111111",
      userId: "UUUUUUUUU",
      transactionStatus: TransactionStatus.VALIDATION_PASSED,
      paymentMethodID: "XXXXXXXXXX",
      leg1Amount: 1000,
      leg2Amount: 1,
      leg1: "USD",
      leg2: "ETH",
    });

    // Producer shouldnot have anything
    expect(MockSqsProducer.producedMessages).toHaveLength(0);

    // A handler should already be register in 'Consumer' with queue 'FiatTransactionInitiator'
    expect(MockSqsConsumer.onCalls.map(val => val.type).sort()).toEqual(["error", "processing_error"].sort());

    expect(MockSqsConsumer.startCallsCount).toBe(1);
    expect(MockSqsConsumer.intializers).toHaveLength(1);
    expect(MockSqsConsumer.intializers[0].queueUrl).toEqual(
      expect.stringContaining(TransactionQueueName.FiatTransactionInitiator),
    );

    when(
      consumerService.requestCheckoutPayment(transaction.props.paymentMethodID, 1000, "USD", transaction.props._id),
    ).thenResolve({ id: initiatedPaymentId });

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    // Call the registered handler (analogous to a message arrival in the queue)
    const registeredHandler = MockSqsConsumer.intializers[0].handleMessage;
    await registeredHandler({
      id: transaction.props._id,
      Body: transaction.props._id,
      MessageAttributes: { hostname: { DataType: "String", StringValue: os.hostname() } },
    });

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);

    expect(MockSqsProducer.producedMessages).toHaveLength(1);
    expect(MockSqsProducer.producedMessages[0].id).toEqual(transaction.props._id);

    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_INITIATED);
  });
});
