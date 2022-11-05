import { Test, TestingModule } from "@nestjs/testing";
import { DBProvider } from "../../../../infraproviders/DBProvider";
import { getMockConsumerServiceWithDefaults } from "../../../consumer/mocks/mock.consumer.service";
import { anyString, anything, capture, instance, when } from "ts-mockito";
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
import { Transaction, TransactionProps } from "../../domain/Transaction";
import { TransactionQueueName, TransactionStatus } from "../../domain/Types";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, Collection } from "mongodb";
import { MongoDBTransactionRepo } from "../../repo/MongoDBTransactionRepo";
import mongoose from "mongoose";
import { VerificationService } from "../../../../modules/verification/verification.service";
import { getMockVerificationServiceWithDefaults } from "../../../../modules/verification/mocks/mock.verification.service";
import { SqsClient } from "../../queueprocessors/sqs.client";
import { TransactionService } from "../../transaction.service";
import { getMockTransactionServiceWithDefaults } from "../../mocks/mock.transactions.repo";
import { getMockSqsClientWithDefaults } from "../../mocks/mock.sqs.client";
import { Consumer } from "../../../../modules/consumer/domain/Consumer";
import { PaymentMethodStatus } from "../../../../modules/consumer/domain/VerificationStatus";
import { LockService } from "../../../../modules/common/lock.service";
import { getMockLockServiceWithDefaults } from "../../../../modules/common/mocks/mock.lock.service";
import { ObjectType } from "../../../../modules/common/domain/ObjectType";
import { PaymentProvider } from "../../../../modules/consumer/domain/PaymentProvider";
import { PaymentMethod, PaymentMethodType } from "../../../../modules/consumer/domain/PaymentMethod";
import {
  CardFailureExceptionText,
  CardProcessingException,
} from "../../../../modules/consumer/CardProcessingException";

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
  jest.setTimeout(1000000);

  let consumerService: ConsumerService;
  let sqsClient: SqsClient;
  let transactionService: TransactionService;
  let fiatTransactionInitiator: FiatTransactionInitiator;

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

    // This behaviour is in the 'beforeEach' because `FiatTransactionInitiator` will be initiated
    // by Nest in the `createTestingModule()` method.
    // As we are subscribing to the queue in the constructor of `MessageProcessor`, the call
    // to `sqsClient.subscribeToQueue()` will be made and we don't want that to fail :)
    when(sqsClient.subscribeToQueue(TransactionQueueName.FiatTransactionInitiator, anything())).thenReturn({
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
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const initiatedPaymentId = "CCCCCCCCCC";
  const consumerID = "UUUUUUUUUU";
  const paymentMethodID = "XXXXXXXXXX";
  const transaction: Transaction = Transaction.createTransaction({
    _id: "1111111111",
    userId: consumerID,
    transactionStatus: TransactionStatus.VALIDATION_PASSED,
    fiatPaymentInfo: {
      paymentMethodID: paymentMethodID,
      isSettled: false,
      details: [],
      paymentProvider: PaymentProvider.CHECKOUT,
    },
    leg1Amount: 1000,
    leg2Amount: 1,
    leg1: "USD",
    leg2: "ETH",
    partnerID: "12345",
    lastProcessingTimestamp: Date.now().valueOf(),
    lastStatusUpdateTimestamp: Date.now().valueOf(),
  });
  const paymentMethod: PaymentMethod = {
    status: PaymentMethodStatus.APPROVED,
    type: PaymentMethodType.CARD,
    cardData: {
      first6Digits: "123456",
      last4Digits: "4321",
    },
    imageUri: "...",
    paymentToken: "XXXXXXXXXX",
    paymentProviderID: PaymentProvider.CHECKOUT,
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

  it("should not process a transaction that's not in VALIDATION_PASSED status", async () => {
    // expect that 'FiatTransactionInitiator' actually subscribed to 'FiatTransactionInitiator' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiator);
    expect(processor).toBeInstanceOf(FiatTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.PENDING,
      _id: transaction.props._id as any,
    });

    await fiatTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.PENDING);
    expect(allTransactionsInDb[0].fiatPaymentInfo.paymentID).toBeUndefined();
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });

  it("should process the fiat transaction and put it in next queue", async () => {
    // expect that 'FiatTransactionInitiator' actually subscribed to 'FiatTransactionInitiator' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiator);
    expect(processor).toBeInstanceOf(FiatTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(consumerService.requestPayment(consumer, anything())).thenResolve({
      status: PaymentMethodStatus.APPROVED,
      paymentID: initiatedPaymentId,
    });
    when(sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    await fiatTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_INITIATED);
    expect(allTransactionsInDb[0].fiatPaymentInfo.paymentID).toBe(initiatedPaymentId);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
      transaction.props.lastStatusUpdateTimestamp,
    );

    const [queueName, transactionId] = capture(sqsClient.enqueue).last();
    expect(queueName).toBe(TransactionQueueName.FiatTransactionInitiated);
    expect(transactionId).toBe(transaction.props._id);
  });

  it("should move REJECTED transactions to the failure queue", async () => {
    // expect that 'FiatTransactionInitiator' actually subscribed to 'FiatTransactionInitiator' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiator);
    expect(processor).toBeInstanceOf(FiatTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);

    const rejectCode = "1234";
    const rejectReason = "Bad payment";
    when(consumerService.requestPayment(consumer, anything())).thenResolve({
      status: PaymentMethodStatus.REJECTED,
      paymentID: initiatedPaymentId,
      responseCode: rejectCode,
      responseSummary: rejectReason,
    });

    setupMocksandEnqueue(sqsClient, transaction, lockService, verificationService, consumerService, consumerID);
    await fiatTransactionInitiator.processMessageInternal(transaction.props._id);
    await performFailureAssertions(transactionCollection, sqsClient, transaction);
  });

  it("should move FLAGGED transactions to the failure queue", async () => {
    // expect that 'FiatTransactionInitiator' actually subscribed to 'FiatTransactionInitiator' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiator);
    expect(processor).toBeInstanceOf(FiatTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);

    const rejectCode = "1234";
    const rejectReason = "Bad payment";
    when(consumerService.requestPayment(consumer, anything())).thenResolve({
      status: PaymentMethodStatus.FLAGGED,
      paymentID: initiatedPaymentId,
      responseCode: rejectCode,
      responseSummary: rejectReason,
    });

    setupMocksandEnqueue(sqsClient, transaction, lockService, verificationService, consumerService, consumerID);
    await fiatTransactionInitiator.processMessageInternal(transaction.props._id);
    await performFailureAssertions(transactionCollection, sqsClient, transaction);
  });

  it("should move UNKNOWN statuses to the failure queue", async () => {
    // expect that 'FiatTransactionInitiator' actually subscribed to 'FiatTransactionInitiator' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiator);
    expect(processor).toBeInstanceOf(FiatTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);

    const rejectCode = "1234";
    const rejectReason = "Bad payment";
    when(consumerService.requestPayment(consumer, anything())).thenResolve({
      status: undefined,
      paymentID: initiatedPaymentId,
      responseCode: rejectCode,
      responseSummary: rejectReason,
    });

    setupMocksandEnqueue(sqsClient, transaction, lockService, verificationService, consumerService, consumerID);
    await fiatTransactionInitiator.processMessageInternal(transaction.props._id);
    await performFailureAssertions(transactionCollection, sqsClient, transaction);
  });

  it("should handle unknown exceptions from checkout", async () => {
    // expect that 'FiatTransactionInitiator' actually subscribed to 'FiatTransactionInitiator' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiator);
    expect(processor).toBeInstanceOf(FiatTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);

    const rejectCode = "1234";
    const rejectReason = "Bad payment";
    when(consumerService.requestPayment(consumer, anything())).thenThrow(new Error("Any error"));

    setupMocksandEnqueue(sqsClient, transaction, lockService, verificationService, consumerService, consumerID);
    await fiatTransactionInitiator.processMessageInternal(transaction.props._id);
    await performFailureAssertions(transactionCollection, sqsClient, transaction);
  });

  it("should handle card processing ERROR exceptions from checkout", async () => {
    // expect that 'FiatTransactionInitiator' actually subscribed to 'FiatTransactionInitiator' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiator);
    expect(processor).toBeInstanceOf(FiatTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);

    const rejectCode = "1234";
    const rejectReason = "Bad payment";
    when(consumerService.requestPayment(consumer, anything())).thenThrow(
      new CardProcessingException(CardFailureExceptionText.ERROR),
    );

    setupMocksandEnqueue(sqsClient, transaction, lockService, verificationService, consumerService, consumerID);
    await fiatTransactionInitiator.processMessageInternal(transaction.props._id);
    await performFailureAssertions(transactionCollection, sqsClient, transaction);
  });

  it("should handle card processing NO_CRYPTO exceptions from checkout", async () => {
    // expect that 'FiatTransactionInitiator' actually subscribed to 'FiatTransactionInitiator' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionInitiator);
    expect(processor).toBeInstanceOf(FiatTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      _id: transaction.props._id as any,
    });

    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);

    const rejectCode = "1234";
    const rejectReason = "Bad payment";
    when(consumerService.requestPayment(consumer, anything())).thenThrow(
      new CardProcessingException(CardFailureExceptionText.NO_CRYPTO, rejectCode, rejectReason),
    );

    setupMocksandEnqueue(sqsClient, transaction, lockService, verificationService, consumerService, consumerID);
    await fiatTransactionInitiator.processMessageInternal(transaction.props._id);
    await performFailureAssertions(transactionCollection, sqsClient, transaction);
  });
});

function setupMocksandEnqueue(
  sqsClient: SqsClient,
  transaction: Transaction,
  lockService: LockService,
  verificationService: VerificationService,
  consumerService: ConsumerService,
  consumerID: string,
) {
  when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
  when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
  when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

  when(verificationService.provideTransactionFeedback(anything(), anything(), anything(), anyString())).thenResolve();
  when(consumerService.updatePaymentMethod(consumerID, anything())).thenResolve();
}

async function performFailureAssertions(transactionCollection, sqsClient: SqsClient, transaction: Transaction) {
  // TODO: assert that the paymentMethod was updated
  /*expect(consumerService.updatePaymentMethod()).toHaveBeenCalledWith(
      consumerID,
      deepEqual({
        ...paymentMethod,
        status: PaymentMethodStatus.REJECTED,
        authCode: rejectCode,
        authReason: rejectReason,
      }),
    );*/

  const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
  expect(allTransactionsInDb).toHaveLength(1);
  expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_FAILED);
  expect(allTransactionsInDb[0].fiatPaymentInfo.paymentID).toBeUndefined();

  const [queueName, transactionId] = capture(sqsClient.enqueue).last();
  expect(queueName).toBe(TransactionQueueName.TransactionFailed);
  expect(transactionId).toBe(transaction.props._id);
}
