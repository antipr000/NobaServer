import { Test, TestingModule } from "@nestjs/testing";
import { DBProvider } from "../../../../infraproviders/DBProvider";
import { getMockConsumerServiceWithDefaults } from "../../../consumer/mocks/mock.consumer.service";
import { anything, capture, instance, when } from "ts-mockito";
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
import { TransactionQueueName, TransactionStatus } from "../../domain/Types";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Collection } from "mongodb";
import { MongoDBTransactionRepo } from "../../repo/MongoDBTransactionRepo";
import mongoose from "mongoose";
import { SqsClient } from "../../queueprocessors/sqs.client";
import { TransactionService } from "../../transaction.service";
import { getMockTransactionServiceWithDefaults } from "../../mocks/mock.transactions.repo";
import { getMockSqsClientWithDefaults } from "../../mocks/mock.sqs.client";
import { FiatTransactionStatusProcessor } from "../../queueprocessors/FiatTransactionStatusProcessor";
import { FiatTransactionStatus } from "../../../../modules/consumer/domain/Types";
import { LockService } from "../../../../modules/common/lock.service";
import { getMockLockServiceWithDefaults } from "../../../../modules/common/mocks/mock.lock.service";
import { ObjectType } from "../../../../modules/common/domain/ObjectType";
import { PaymentProvider } from "../../../../modules/consumer/domain/PaymentProvider";
import { Consumer } from "../../../../modules/consumer/domain/Consumer";
import { PaymentMethodType } from "../../../../modules/consumer/domain/PaymentMethod";

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
  let sqsClient: SqsClient;
  let transactionService: TransactionService;
  let fiatTransactionStatusProcessor: FiatTransactionStatusProcessor;

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let transactionCollection: Collection;
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
    transactionService = getMockTransactionServiceWithDefaults();
    sqsClient = getMockSqsClientWithDefaults();
    lockService = getMockLockServiceWithDefaults();

    // This behaviour is in the 'beforeEach' because `FiatTransactionInitiator` will be initiated
    // by Nest in the `createTestingModule()` method.
    // As we are subscribing to the queue in the constructor of `MessageProcessor`, the call
    // to `sqsClient.subscribeToQueue()` will be made and we don't want that to fail :)
    when(sqsClient.subscribeToQueue(TransactionQueueName.FiatTransactionInitiated, anything())).thenReturn({
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
          provide: LockService,
          useFactory: () => instance(lockService),
        },
        FiatTransactionStatusProcessor,
      ],
    }).compile();

    fiatTransactionStatusProcessor = app.get<FiatTransactionStatusProcessor>(FiatTransactionStatusProcessor);

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

  const consumerID = "UUUUUUUUUUU";
  const cardPaymentToken = "CCCCCCCCCCCC";
  const achPaymentToken = "AAAAAAAAAAAA";
  const consumerWithBothCardAndAchPaymentMethods = Consumer.createConsumer({
    _id: consumerID,
    firstName: "Fake",
    lastName: "Name",
    email: "test@noba.com",
    displayEmail: "test@noba.com",
    paymentProviderAccounts: [
      {
        providerCustomerID: "test-customer-1",
        providerID: PaymentProvider.CHECKOUT,
      },
    ],
    partners: [
      {
        partnerID: "mock-partner-id",
      },
    ],
    isAdmin: false,
    paymentMethods: [
      {
        type: PaymentMethodType.CARD,
        paymentProviderID: PaymentProvider.CHECKOUT,
        paymentToken: cardPaymentToken,
        cardData: {
          first6Digits: "123456",
          last4Digits: "7890",
        },
        imageUri: "https://noba.com",
        isDefault: false,
      },
      {
        type: PaymentMethodType.ACH,
        paymentProviderID: PaymentProvider.CHECKOUT,
        paymentToken: achPaymentToken,
        achData: {
          accessToken: "dummy-access-token",
          accountID: "dummy-account-id",
          accountType: "checking",
          itemID: "item-id",
          mask: "1234",
        },
        imageUri: "https://noba.com",
        isDefault: false,
      },
    ],
    cryptoWallets: [],
  });

  it("should exit flow if transaction status is not 'FIAT_INCOMING_INITIATED'", async () => {
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiated);
    expect(processor).toBeInstanceOf(FiatTransactionStatusProcessor);

    const initiatedPaymentId = "CCCCCCCCCC";
    const transaction: Transaction = Transaction.createTransaction({
      _id: "1111111111",
      userId: consumerID,
      transactionStatus: TransactionStatus.VALIDATION_PASSED,
      fiatPaymentInfo: {
        paymentMethodID: cardPaymentToken,
        paymentID: initiatedPaymentId,
        isCompleted: false,
        isApproved: false,
        isFailed: false,
        details: [],
        paymentProvider: PaymentProvider.CHECKOUT,
      },
      leg1Amount: 1000,
      leg2Amount: 1,
      leg1: "USD",
      leg2: "ETH",
      lastStatusUpdateTimestamp: Date.now().valueOf(),
      partnerID: "12345",
    });

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    await fiatTransactionStatusProcessor.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.VALIDATION_PASSED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toEqual(transaction.props.lastStatusUpdateTimestamp);
  });

  describe("CARD Payment Method", () => {
    it("should do nothing payment status is pending", async () => {
      const initiatedPaymentId = "CCCCCCCCCC";
      const transaction: Transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: consumerID,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: cardPaymentToken,
          paymentID: initiatedPaymentId,
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        lastStatusUpdateTimestamp: Date.now().valueOf(),
        partnerID: "12345",
      });

      await transactionCollection.insertOne({
        ...transaction.props,
        _id: transaction.props._id as any,
      });

      when(consumerService.getConsumer(consumerID)).thenResolve(consumerWithBothCardAndAchPaymentMethods);
      when(consumerService.getFiatPaymentStatus(initiatedPaymentId, PaymentProvider.CHECKOUT)).thenResolve(
        FiatTransactionStatus.PENDING,
      );

      await fiatTransactionStatusProcessor.processMessageInternal(transaction.props._id);

      const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);

      expect(allTransactionsInDb).toHaveLength(1);
      expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_INITIATED);
      expect(allTransactionsInDb[0].fiatPaymentInfo.paymentID).toBe(initiatedPaymentId);
      expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toEqual(transaction.props.lastStatusUpdateTimestamp);
    });

    it("should move into failed queue if transaction fails", async () => {
      const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
      expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiated);
      expect(processor).toBeInstanceOf(FiatTransactionStatusProcessor);

      const initiatedPaymentId = "CCCCCCCCCC";
      const transaction: Transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: consumerID,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: cardPaymentToken,
          paymentID: initiatedPaymentId,
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        lastStatusUpdateTimestamp: Date.now().valueOf(),
        partnerID: "12345",
      });

      await transactionCollection.insertOne({
        ...transaction.props,
        _id: transaction.props._id as any,
      });

      when(consumerService.getConsumer(consumerID)).thenResolve(consumerWithBothCardAndAchPaymentMethods);
      when(consumerService.getFiatPaymentStatus(initiatedPaymentId, PaymentProvider.CHECKOUT)).thenResolve(
        FiatTransactionStatus.FAILED,
      );
      when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
      when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
      when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

      await fiatTransactionStatusProcessor.processMessageInternal(transaction.props._id);

      const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allTransactionsInDb).toHaveLength(1);
      expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_FAILED);
      expect(allTransactionsInDb[0].fiatPaymentInfo.paymentID).toBe(initiatedPaymentId);
      expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
        transaction.props.lastStatusUpdateTimestamp,
      );

      const [queueName, transactionId] = capture(sqsClient.enqueue).last();
      expect(queueName).toBe(TransactionQueueName.TransactionFailed);
      expect(transactionId).toBe(transaction.props._id);
    });

    it("should process fiat transaction status and put it in next queue", async () => {
      const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
      expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiated);
      expect(processor).toBeInstanceOf(FiatTransactionStatusProcessor);

      const initiatedPaymentId = "CCCCCCCCCC";
      const transaction: Transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: consumerID,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: cardPaymentToken,
          paymentID: initiatedPaymentId,
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        lastStatusUpdateTimestamp: Date.now().valueOf(),
        partnerID: "12345",
      });

      await transactionCollection.insertOne({
        ...transaction.props,
        _id: transaction.props._id as any,
      });

      when(consumerService.getConsumer(consumerID)).thenResolve(consumerWithBothCardAndAchPaymentMethods);
      when(consumerService.getFiatPaymentStatus(initiatedPaymentId, PaymentProvider.CHECKOUT)).thenResolve(
        FiatTransactionStatus.CAPTURED,
      );
      when(sqsClient.enqueue(TransactionQueueName.FiatTransactionCompleted, transaction.props._id)).thenResolve("");
      when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
      when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

      await fiatTransactionStatusProcessor.processMessageInternal(transaction.props._id);

      const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allTransactionsInDb).toHaveLength(1);
      expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_COMPLETED);
      expect(allTransactionsInDb[0].fiatPaymentInfo.paymentID).toBe(initiatedPaymentId);
      expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
        transaction.props.lastStatusUpdateTimestamp,
      );

      const [queueName, transactionId] = capture(sqsClient.enqueue).last();
      expect(queueName).toBe(TransactionQueueName.FiatTransactionCompleted);
      expect(transactionId).toBe(transaction.props._id);
    });
  });

  describe("ACH Payment Method", () => {
    it("should skip the transaction if none of 'isApproved' or 'isFailed' is 'true'", async () => {
      const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
      expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiated);
      expect(processor).toBeInstanceOf(FiatTransactionStatusProcessor);

      const initiatedPaymentId = "CCCCCCCCCC";
      const transaction: Transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: consumerID,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: achPaymentToken,
          paymentID: initiatedPaymentId,
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        lastStatusUpdateTimestamp: Date.now().valueOf(),
        partnerID: "12345",
      });

      await transactionCollection.insertOne({
        ...transaction.props,
        _id: transaction.props._id as any,
      });

      when(consumerService.getConsumer(consumerID)).thenResolve(consumerWithBothCardAndAchPaymentMethods);
      when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
      when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

      await fiatTransactionStatusProcessor.processMessageInternal(transaction.props._id);

      const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allTransactionsInDb).toHaveLength(1);
      expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_INITIATED);
      expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
      expect(allTransactionsInDb[0].fiatPaymentInfo.isApproved).toBe(false);
      expect(allTransactionsInDb[0].fiatPaymentInfo.isFailed).toBe(false);
      expect(allTransactionsInDb[0].fiatPaymentInfo.isCompleted).toBe(false);
    });

    it("should move the transaction to 'FAILED' queue if 'isFailed' is 'true'", async () => {
      const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
      expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiated);
      expect(processor).toBeInstanceOf(FiatTransactionStatusProcessor);

      const initiatedPaymentId = "CCCCCCCCCC";
      const transaction: Transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: consumerID,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: achPaymentToken,
          paymentID: initiatedPaymentId,
          isCompleted: false,
          isApproved: false,
          isFailed: true,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        lastStatusUpdateTimestamp: Date.now().valueOf(),
        partnerID: "12345",
      });

      await transactionCollection.insertOne({
        ...transaction.props,
        _id: transaction.props._id as any,
      });

      when(consumerService.getConsumer(consumerID)).thenResolve(consumerWithBothCardAndAchPaymentMethods);
      when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
      when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
      when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

      await fiatTransactionStatusProcessor.processMessageInternal(transaction.props._id);

      const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allTransactionsInDb).toHaveLength(1);
      expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_FAILED);
      expect(allTransactionsInDb[0].fiatPaymentInfo.paymentID).toBe(initiatedPaymentId);
      expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
        transaction.props.lastStatusUpdateTimestamp,
      );
      expect(allTransactionsInDb[0].fiatPaymentInfo.isApproved).toBe(false);
      expect(allTransactionsInDb[0].fiatPaymentInfo.isFailed).toBe(true);
      expect(allTransactionsInDb[0].fiatPaymentInfo.isCompleted).toBe(true);

      const [queueName, transactionId] = capture(sqsClient.enqueue).last();
      expect(queueName).toBe(TransactionQueueName.TransactionFailed);
      expect(transactionId).toBe(transaction.props._id);
    });

    it("should move the transaction to next stage WITHOUT updating 'isCompleted' if 'isApproved' is 'true'", async () => {
      const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
      expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiated);
      expect(processor).toBeInstanceOf(FiatTransactionStatusProcessor);

      const initiatedPaymentId = "CCCCCCCCCC";
      const transaction: Transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: consumerID,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: achPaymentToken,
          paymentID: initiatedPaymentId,
          isCompleted: false,
          isApproved: true,
          isFailed: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        lastStatusUpdateTimestamp: Date.now().valueOf(),
        partnerID: "12345",
      });

      await transactionCollection.insertOne({
        ...transaction.props,
        _id: transaction.props._id as any,
      });

      when(consumerService.getConsumer(consumerID)).thenResolve(consumerWithBothCardAndAchPaymentMethods);
      when(sqsClient.enqueue(TransactionQueueName.FiatTransactionCompleted, transaction.props._id)).thenResolve("");
      when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
      when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

      await fiatTransactionStatusProcessor.processMessageInternal(transaction.props._id);

      const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allTransactionsInDb).toHaveLength(1);
      expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_COMPLETED);
      expect(allTransactionsInDb[0].fiatPaymentInfo.paymentID).toBe(initiatedPaymentId);
      expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
        transaction.props.lastStatusUpdateTimestamp,
      );
      expect(allTransactionsInDb[0].fiatPaymentInfo.isApproved).toBe(true);
      expect(allTransactionsInDb[0].fiatPaymentInfo.isFailed).toBe(false);
      expect(allTransactionsInDb[0].fiatPaymentInfo.isCompleted).toBe(false);

      const [queueName, transactionId] = capture(sqsClient.enqueue).last();
      expect(queueName).toBe(TransactionQueueName.FiatTransactionCompleted);
      expect(transactionId).toBe(transaction.props._id);
    });

    it("should move the transaction to 'FAILED' queue if 'isFailed' & 'isApproved' both are 'true'", async () => {
      const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
      expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiated);
      expect(processor).toBeInstanceOf(FiatTransactionStatusProcessor);

      const initiatedPaymentId = "CCCCCCCCCC";
      const transaction: Transaction = Transaction.createTransaction({
        _id: "1111111111",
        userId: consumerID,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: achPaymentToken,
          paymentID: initiatedPaymentId,
          isCompleted: false,
          isApproved: true,
          isFailed: true,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 1,
        leg1: "USD",
        leg2: "ETH",
        lastStatusUpdateTimestamp: Date.now().valueOf(),
        partnerID: "12345",
      });

      await transactionCollection.insertOne({
        ...transaction.props,
        _id: transaction.props._id as any,
      });

      when(consumerService.getConsumer(consumerID)).thenResolve(consumerWithBothCardAndAchPaymentMethods);
      when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
      when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
      when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

      await fiatTransactionStatusProcessor.processMessageInternal(transaction.props._id);

      const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allTransactionsInDb).toHaveLength(1);
      expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_FAILED);
      expect(allTransactionsInDb[0].fiatPaymentInfo.paymentID).toBe(initiatedPaymentId);
      expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
        transaction.props.lastStatusUpdateTimestamp,
      );
      expect(allTransactionsInDb[0].fiatPaymentInfo.isApproved).toBe(true);
      expect(allTransactionsInDb[0].fiatPaymentInfo.isFailed).toBe(true);
      expect(allTransactionsInDb[0].fiatPaymentInfo.isCompleted).toBe(true);

      const [queueName, transactionId] = capture(sqsClient.enqueue).last();
      expect(queueName).toBe(TransactionQueueName.TransactionFailed);
      expect(transactionId).toBe(transaction.props._id);
    });
  });
});
