import { Test, TestingModule } from "@nestjs/testing";
import { DBProvider } from "../../../../infraproviders/DBProvider";
import { getMockConsumerServiceWithDefaults } from "../../../consumer/mocks/mock.consumer.service";
import { anyString, anything, capture, instance, when } from "ts-mockito";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { ConsumerService } from "../../../consumer/consumer.service";
import {
  MONGO_CONFIG_KEY,
  MONGO_URI,
  NODE_ENV_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../../config/ConfigurationUtils";
import { Transaction, TransactionProps } from "../../domain/Transaction";
import { TransactionQueueName, TransactionStatus, TransactionType } from "../../domain/Types";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Collection } from "mongodb";
import { MongoDBTransactionRepo } from "../../repo/MongoDBTransactionRepo";
import mongoose from "mongoose";
import { SqsClient } from "../../queueprocessors/sqs.client";
import { getMockSqsClientWithDefaults } from "../../mocks/mock.sqs.client";
import { LockService } from "../../../../modules/common/lock.service";
import { getMockLockServiceWithDefaults } from "../../../../modules/common/mocks/mock.lock.service";
import { ObjectType } from "../../../../modules/common/domain/ObjectType";
import { CryptoTransactionStatusProcessor } from "../../queueprocessors/CryptoTransactionStatusProcessor";
import { EmailService } from "../../../../modules/common/email.service";
import { getMockEmailServiceWithDefaults } from "../../../../modules/common/mocks/mock.email.service";
import { AssetService } from "../../assets/asset.service";
import { PollStatus } from "../../domain/AssetTypes";
import { TransactionService } from "../../transaction.service";
import { getMockTransactionServiceWithDefaults } from "../../mocks/mock.transactions.repo";
import { AssetServiceFactory } from "../../assets/asset.service.factory";
import {
  getMockAssetServiceFactoryWithDefaultAssetService,
  getMockAssetServiceWithDefaults,
} from "../../mocks/mock.asset.service";
import { Consumer } from "../../../../modules/consumer/domain/Consumer";

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

describe("CryptoTransactionStatusProcessor", () => {
  jest.setTimeout(10000);

  let consumerService: ConsumerService;
  let sqsClient: SqsClient;
  let assetServiceFactory: AssetServiceFactory;
  let assetService: AssetService;
  let cryptoTransactionStatusProcessor: CryptoTransactionStatusProcessor;
  let transactionService: TransactionService;

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let transactionCollection: Collection;
  let lockService: LockService;
  let emailService: EmailService;

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

    consumerService = getMockConsumerServiceWithDefaults();
    assetServiceFactory = getMockAssetServiceFactoryWithDefaultAssetService();
    sqsClient = getMockSqsClientWithDefaults();
    lockService = getMockLockServiceWithDefaults();
    emailService = getMockEmailServiceWithDefaults();
    transactionService = getMockTransactionServiceWithDefaults();

    // This behaviour is in the 'beforeEach' because `FiatTransactionInitiator` will be initiated
    // by Nest in the `createTestingModule()` method.
    // As we are subscribing to the queue in the constructor of `MessageProcessor`, the call
    // to `sqsClient.subscribeToQueue()` will be made and we don't want that to fail :)
    when(sqsClient.subscribeToQueue(TransactionQueueName.CryptoTransactionInitiated, anything())).thenReturn({
      start: () => {},
    } as any);

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
        {
          provide: SqsClient,
          useFactory: () => instance(sqsClient),
        },
        {
          provide: TransactionService,
          useFactory: () => instance(transactionService),
        },
        {
          provide: AssetServiceFactory,
          useFactory: () => instance(assetServiceFactory),
        },
        {
          provide: LockService,
          useFactory: () => instance(lockService),
        },
        {
          provide: EmailService,
          useFactory: () => instance(emailService),
        },
        CryptoTransactionStatusProcessor,
      ],
    }).compile();

    cryptoTransactionStatusProcessor = app.get<CryptoTransactionStatusProcessor>(CryptoTransactionStatusProcessor);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    transactionCollection = mongoClient.db("").collection("transactions");

    assetService = getMockAssetServiceWithDefaults();
    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(anyString())).thenReturn(assetServiceInstance);
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should process crypto transaction status", async () => {
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.CryptoTransactionInitiated);
    expect(processor).toBeInstanceOf(CryptoTransactionStatusProcessor);

    const initiatedPaymentId = "crypto-payment-id";
    const transaction: Transaction = Transaction.createTransaction({
      _id: "1111111111",
      userId: "UUUUUUUUU",
      transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
      paymentMethodID: "XXXXXXXXXX",
      leg1Amount: 1000,
      leg2Amount: 1,
      leg1: "USD",
      leg2: "ETH",
      checkoutPaymentID: "checkout-id",
      lastStatusUpdateTimestamp: Date.now().valueOf(),
      cryptoTransactionId: initiatedPaymentId,
      type: TransactionType.ONRAMP,
      partnerID: "12345",
      transactionExceptions: [],
    });

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    when(assetService.pollAssetTransferToConsumerStatus(initiatedPaymentId)).thenResolve({
      status: PollStatus.SUCCESS,
      errorMessage: null,
    });
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    await cryptoTransactionStatusProcessor.processMessage(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.CRYPTO_OUTGOING_COMPLETED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
      transaction.props.lastStatusUpdateTimestamp,
    );
  });

  it("should exit flow if transaction status is not 'CRYPTO_OUTGOING_INITIATED'", async () => {
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.CryptoTransactionInitiated);
    expect(processor).toBeInstanceOf(CryptoTransactionStatusProcessor);

    const initiatedPaymentId = "crypto-payment-id";
    const transaction: Transaction = Transaction.createTransaction({
      _id: "1111111111",
      userId: "UUUUUUUUU",
      transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATING,
      paymentMethodID: "XXXXXXXXXX",
      leg1Amount: 1000,
      leg2Amount: 1,
      leg1: "USD",
      leg2: "ETH",
      checkoutPaymentID: "checkout-id",
      lastStatusUpdateTimestamp: Date.now().valueOf(),
      cryptoTransactionId: initiatedPaymentId,
      type: TransactionType.ONRAMP,
      partnerID: "12345",
      transactionExceptions: [],
    });

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    await cryptoTransactionStatusProcessor.processMessage(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.CRYPTO_OUTGOING_INITIATING);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toEqual(transaction.props.lastStatusUpdateTimestamp);
  });

  it("should move into failed queue if crypto transaction fails", async () => {
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.CryptoTransactionInitiated);
    expect(processor).toBeInstanceOf(CryptoTransactionStatusProcessor);

    const initiatedPaymentId = "crypto-payment-id";
    const transaction: Transaction = Transaction.createTransaction({
      _id: "1111111111",
      userId: "UUUUUUUUU",
      transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
      paymentMethodID: "XXXXXXXXXX",
      leg1Amount: 1000,
      leg2Amount: 1,
      leg1: "USD",
      leg2: "ETH",
      checkoutPaymentID: "checkout-id",
      lastStatusUpdateTimestamp: Date.now().valueOf(),
      cryptoTransactionId: initiatedPaymentId,
      type: TransactionType.ONRAMP,
      partnerID: "12345",
      transactionExceptions: [],
    });

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    when(assetService.pollAssetTransferToConsumerStatus(initiatedPaymentId)).thenResolve({
      status: PollStatus.FAILURE,
      errorMessage: "Test error",
    });
    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
    when(consumerService.getConsumer(transaction.props.userId)).thenResolve(
      Consumer.createConsumer({
        _id: transaction.props._id,
        email: "test+consumer@noba.com",
        partners: [
          {
            partnerID: "testpartner",
          },
        ],
      }),
    );

    await cryptoTransactionStatusProcessor.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.CRYPTO_OUTGOING_FAILED);
    expect(allTransactionsInDb[0].cryptoTransactionId).toBe(initiatedPaymentId);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toEqual(transaction.props.lastStatusUpdateTimestamp);

    const [queueName, transactionId] = capture(sqsClient.enqueue).last();
    expect(queueName).toBe(TransactionQueueName.TransactionFailed);
    expect(transactionId).toBe(transaction.props._id);
  });

  it("should do nothing if crypto transaction status is pending", async () => {
    const initiatedPaymentId = "crypto-payment-id";
    const transaction: Transaction = Transaction.createTransaction({
      _id: "1111111111",
      userId: "UUUUUUUUU",
      transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
      paymentMethodID: "XXXXXXXXXX",
      leg1Amount: 1000,
      leg2Amount: 1,
      leg1: "USD",
      leg2: "ETH",
      checkoutPaymentID: "checkout-id",
      lastStatusUpdateTimestamp: Date.now().valueOf(),
      cryptoTransactionId: initiatedPaymentId,
      type: TransactionType.ONRAMP,
      partnerID: "12345",
      transactionExceptions: [],
    });

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    when(assetService.pollAssetTransferToConsumerStatus(initiatedPaymentId)).thenResolve({
      status: PollStatus.PENDING,
      errorMessage: null,
    });

    await cryptoTransactionStatusProcessor.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);

    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.CRYPTO_OUTGOING_INITIATED);
    expect(allTransactionsInDb[0].cryptoTransactionId).toBe(initiatedPaymentId);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toEqual(transaction.props.lastStatusUpdateTimestamp);
  });
});
