import { Test, TestingModule } from "@nestjs/testing";
import { Collection, MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { anything, capture, instance, when } from "ts-mockito";
import {
  MONGO_CONFIG_KEY,
  MONGO_URI,
  NODE_ENV_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { DBProvider } from "../../../../infraproviders/DBProvider";
import { ObjectType } from "../../../../modules/common/domain/ObjectType";
import { LockService } from "../../../../modules/common/lock.service";
import { getMockLockServiceWithDefaults } from "../../../../modules/common/mocks/mock.lock.service";
import { Consumer } from "../../../../modules/consumer/domain/Consumer";
import { PaymentMethod } from "../../../../modules/consumer/domain/PaymentMethod";
import { PaymentProviders } from "../../../../modules/consumer/domain/PaymentProviderDetails";
import { PaymentMethodStatus } from "../../../../modules/consumer/domain/VerificationStatus";
import { getMockVerificationServiceWithDefaults } from "../../../../modules/verification/mocks/mock.verification.service";
import { VerificationService } from "../../../../modules/verification/verification.service";
import { ConsumerService } from "../../../consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../consumer/mocks/mock.consumer.service";
import { AssetService } from "../../assets/asset.service";
import { AssetServiceFactory } from "../../assets/asset.service.factory";
import { FundsAvailabilityResponse, PollStatus } from "../../domain/AssetTypes";
import { Transaction, TransactionProps } from "../../domain/Transaction";
import { TransactionQueueName, TransactionStatus } from "../../domain/Types";
import {
  getMockAssetServiceFactoryWithDefaultAssetService,
  getMockAssetServiceWithDefaults,
} from "../../mocks/mock.asset.service";
import { getMockSqsClientWithDefaults } from "../../mocks/mock.sqs.client";
import { getMockTransactionServiceWithDefaults } from "../../mocks/mock.transactions.repo";
import { CryptoTransactionInitiator } from "../../queueprocessors/CryptoTransactionInitiator";
import { SqsClient } from "../../queueprocessors/sqs.client";
import { MongoDBTransactionRepo } from "../../repo/MongoDBTransactionRepo";
import { TransactionService } from "../../transaction.service";

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

describe("CryptoTransactionInitiator", () => {
  jest.setTimeout(1000000);

  let consumerService: ConsumerService;
  let assetServiceFactory: AssetServiceFactory;
  let assetService: AssetService;

  let sqsClient: SqsClient;
  let transactionService: TransactionService;
  let cryptoTransactionInitiator: CryptoTransactionInitiator;

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let transactionCollection: Collection;
  let verificationService: VerificationService;
  let lockService: LockService;

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
    verificationService = getMockVerificationServiceWithDefaults();
    transactionService = getMockTransactionServiceWithDefaults();
    sqsClient = getMockSqsClientWithDefaults();
    lockService = getMockLockServiceWithDefaults();
    assetServiceFactory = getMockAssetServiceFactoryWithDefaultAssetService();
    assetService = getMockAssetServiceWithDefaults();

    // This behaviour is in the 'beforeEach' because `CryptoTransactionInitiator` will be initiated
    // by Nest in the `createTestingModule()` method.
    // As we are subscribing to the queue in the constructor of `MessageProcessor`, the call
    // to `sqsClient.subscribeToQueue()` will be made and we don't want that to fail :)
    when(sqsClient.subscribeToQueue(TransactionQueueName.FiatTransactionCompleted, anything())).thenReturn({
      // eslint-disable-next-line @typescript-eslint/no-empty-function
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
          provide: VerificationService,
          useFactory: () => instance(verificationService),
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
          provide: LockService,
          useFactory: () => instance(lockService),
        },
        {
          provide: AssetServiceFactory,
          useFactory: () => instance(assetServiceFactory),
        },
        CryptoTransactionInitiator,
      ],
    }).compile();

    cryptoTransactionInitiator = app.get<CryptoTransactionInitiator>(CryptoTransactionInitiator);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    transactionCollection = mongoClient.db("").collection("transactions");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const cryptoAmount = 1970;
  const cryptocurrency = "ETH";
  const initiatedPaymentId = "CCCCCCCCCC";
  const consumerID = "UUUUUUUUUU";
  const paymentMethodID = "XXXXXXXXXX";
  const transaction: Transaction = Transaction.createTransaction({
    _id: "1111111111",
    userId: consumerID,
    transactionStatus: TransactionStatus.VALIDATION_PASSED,
    paymentMethodID: paymentMethodID,
    leg1Amount: 1000,
    leg2Amount: cryptoAmount,
    leg1: "USD",
    leg2: cryptocurrency,
    partnerID: "12345",
    lastProcessingTimestamp: Date.now().valueOf(),
    lastStatusUpdateTimestamp: Date.now().valueOf(),
  });
  const paymentMethod: PaymentMethod = {
    status: PaymentMethodStatus.APPROVED,
    first6Digits: "123456",
    last4Digits: "4321",
    imageUri: "...",
    paymentToken: "XXXXXXXXXX",
    paymentProviderID: PaymentProviders.CHECKOUT,
  };
  const consumer: Consumer = Consumer.createConsumer({
    _id: consumerID,
    email: "test@noba.com",
    partners: [
      {
        partnerID: "partner-1",
      },
    ],
    paymentMethods: [paymentMethod],
  });

  const fundsAvailabilityResponse: FundsAvailabilityResponse = {
    transferID: "123",
    transferredCrypto: cryptoAmount,
    cryptocurrency: cryptocurrency,
  };

  it("should not process a transaction that's not in FIAT_INCOMING_COMPLETED or CRYPTO_OUTGOING_INITIATING status", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.PENDING,
      _id: transaction.props._id as any,
    });

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.PENDING);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });

  it("should process a transaction in FIAT_INCOMING_COMPLETED status", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      _id: transaction.props._id as any,
    });
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenReturn(assetServiceInstance);
    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.SUCCESS,
      errorMessage: "",
      settledId: "123",
    });
    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      quoteID: "12345",
      tradePrice: 12345,
      cryptoReceived: cryptoAmount,
      cryptocurrency: cryptocurrency,
      tradeID: "12345",
    });
    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("12345");

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.CRYPTO_OUTGOING_INITIATED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
      transaction.props.lastStatusUpdateTimestamp,
    );
  });

  it("should process a transaction in FIAT_INCOMING_COMPLETED status, but if fund availability is PENDING then do nothing", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      _id: transaction.props._id as any,
    });
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenReturn(assetServiceInstance);
    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.PENDING,
      errorMessage: "",
      settledId: "123",
    });
    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      quoteID: "12345",
      tradePrice: 12345,
      cryptoReceived: cryptoAmount,
      cryptocurrency: cryptocurrency,
      tradeID: "12345",
    });
    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("12345");

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_COMPLETED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });

  it("should process a transaction in FIAT_INCOMING_COMPLETED status, but if fund availability is FAILURE then mark transaction as failed", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      _id: transaction.props._id as any,
    });
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transaction.props._id)).thenResolve("");
    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenReturn(assetServiceInstance);
    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.FAILURE,
      errorMessage: "test error msg",
      settledId: "123",
    });
    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      quoteID: "12345",
      tradePrice: 12345,
      cryptoReceived: cryptoAmount,
      cryptocurrency: cryptocurrency,
      tradeID: "12345",
    });
    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("12345");

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FAILED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });

  it("should process a transaction in FIAT_INCOMING_COMPLETED status, but if fund availability is FATAL then mark transaction as failed and raise alarm", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      _id: transaction.props._id as any,
    });
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transaction.props._id)).thenResolve("");
    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenReturn(assetServiceInstance);
    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.FATAL_ERROR,
      errorMessage: "test error msg",
      settledId: "123",
    });
    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      quoteID: "12345",
      tradePrice: 12345,
      cryptoReceived: cryptoAmount,
      cryptocurrency: cryptocurrency,
      tradeID: "12345",
    });
    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("12345");

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FAILED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });

  it("should process a transaction in FIAT_INCOMING_COMPLETED status but throw exception if transfer crypto amount != trade crypto amount", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      _id: transaction.props._id as any,
    });
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transaction.props._id)).thenResolve("");
    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenReturn(assetServiceInstance);
    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.FATAL_ERROR,
      errorMessage: "test error msg",
      settledId: "123",
    });
    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      quoteID: "12345",
      tradePrice: 12345,
      cryptoReceived: cryptoAmount * 2,
      cryptocurrency: cryptocurrency,
      tradeID: "12345",
    });
    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("12345");

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FAILED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });

  it("should process a transaction in FIAT_INCOMING_COMPLETED status but throw exception if transfer cryptocurrency != trade cryptocurrency", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      _id: transaction.props._id as any,
    });
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transaction.props._id)).thenResolve("");
    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenReturn(assetServiceInstance);
    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.FATAL_ERROR,
      errorMessage: "test error msg",
      settledId: "123",
    });
    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      quoteID: "12345",
      tradePrice: 12345,
      cryptoReceived: cryptoAmount,
      cryptocurrency: "BTC",
      tradeID: "12345",
    });
    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("12345");

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FAILED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });
});