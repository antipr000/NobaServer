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
import { TransactionQueueName } from "../../domain/Types";
import { Transaction, TransactionProps } from "../../domain/Transaction";
import { TransactionStatus } from "../../domain/Types";
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
import { ValidatePendingTransactionProcessor } from "../../queueprocessors/ValidatePendingTransactionProcessor";
import { Consumer } from "../../../../modules/consumer/domain/Consumer";
import { PaymentMethod, PaymentMethodType } from "../../../../modules/consumer/domain/PaymentMethod";
import { PendingTransactionValidationStatus } from "../../../../modules/consumer/domain/Types";
import { LockService } from "../../../../modules/common/lock.service";
import { getMockLockServiceWithDefaults } from "../../../../modules/common/mocks/mock.lock.service";
import { ObjectType } from "../../../../modules/common/domain/ObjectType";
import {
  TransactionSubmissionException,
  TransactionSubmissionFailureExceptionText,
} from "../../exceptions/TransactionSubmissionException";
import { PaymentProvider } from "../../../../modules/consumer/domain/PaymentProvider";

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

describe("ValidatePendingTransaction", () => {
  jest.setTimeout(10000);

  let consumerService: ConsumerService;
  let sqsClient: SqsClient;
  let transactionService: TransactionService;
  let validatePendingTransaction: ValidatePendingTransactionProcessor;

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

    // This behaviour is in the 'beforeEach' because `ValidatePendingTransactionProcessor` will be initiated
    // by Nest in the `createTestingModule()` method.
    // As we are subscribing to the queue in the constructor of `MessageProcessor`, the call
    // to `sqsClient.subscribeToQueue()` will be made and we don't want that to fail :)
    when(sqsClient.subscribeToQueue(TransactionQueueName.PendingTransactionValidation, anything())).thenReturn({
      start: () => { },
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
        ValidatePendingTransactionProcessor,
      ],
    }).compile();

    validatePendingTransaction = app.get<ValidatePendingTransactionProcessor>(ValidatePendingTransactionProcessor);

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

  describe("processMessage()", () => {
    const consumerID = "2222222222";
    const transaction: Transaction = Transaction.createTransaction({
      _id: "1111111111",
      userId: consumerID,
      sessionKey: "12345",
      transactionStatus: TransactionStatus.PENDING,
      fiatPaymentInfo: {
        paymentMethodID: "XXXXXXXXXX",
        isSettled: false,
        details: [],
        paymentID: undefined,
        paymentProvider: PaymentProvider.CHECKOUT,
      },
      leg1Amount: 1000,
      leg2Amount: 1,
      leg1: "USD",
      leg2: "ETH",
      destinationWalletAddress: "12345",
      lastStatusUpdateTimestamp: Date.now().valueOf(),
      partnerID: "12345",
    });

    const paymentMethod: PaymentMethod = {
      type: PaymentMethodType.CARD,
      cardData: {
        first6Digits: "123456",
        last4Digits: "7890",
      },
      paymentToken: "ABCDE12345",
      imageUri: "xxx",
      paymentProviderID: "xxx" as any,
    };

    //const consumerProps: ConsumerProps = ;
    const consumer = Consumer.createConsumer({
      _id: consumerID,
      firstName: "Mock",
      lastName: "Consumer",
      partners: [
        {
          partnerID: "partner-1",
        },
      ],
      paymentMethods: [paymentMethod],
      dateOfBirth: "1998-01-01",
      email: "mock@noba.com",
    });

    it("should exit flow if transaction status is not PENDING", async () => {
      transaction.props.transactionStatus = TransactionStatus.COMPLETED;
      await transactionCollection.insertOne({
        ...transaction.props,
        _id: transaction.props._id as any,
      });

      when(consumerService.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(sqsClient.enqueue(anything(), anything())).thenResolve("");
      when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
      when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

      await validatePendingTransaction.processMessage(transaction.props._id);
      const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allTransactionsInDb).toHaveLength(1);
      expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.COMPLETED);
      expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toEqual(transaction.props.lastStatusUpdateTimestamp);
    });

    it("should validate successful transaction and put it in next queue", async () => {
      transaction.props.transactionStatus = TransactionStatus.PENDING;
      await transactionCollection.insertOne({
        ...transaction.props,
        _id: transaction.props._id as any,
      });

      // expect that 'ValidatePendingTransactionProcessor' actually subscribed to 'PendingTransactionValidation' queue.
      const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
      expect(subscribedQueueName).toBe(TransactionQueueName.PendingTransactionValidation);
      expect(processor).toBeInstanceOf(ValidatePendingTransactionProcessor);

      when(transactionService.validatePendingTransaction(anything(), anything())).thenResolve(
        PendingTransactionValidationStatus.PASS,
      );
      when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
      when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

      when(consumerService.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(sqsClient.enqueue(anything(), anything())).thenResolve("");

      await validatePendingTransaction.processMessage(transaction.props._id);

      const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allTransactionsInDb).toHaveLength(1);
      expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.VALIDATION_PASSED);
      expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
        transaction.props.lastStatusUpdateTimestamp,
      );

      const [queueName, transactionId] = capture(sqsClient.enqueue).last();
      expect(queueName).toBe(TransactionQueueName.FiatTransactionInitiator);
      expect(transactionId).toBe(transaction.props._id);
    });

    it("should validate failed transaction and put it in failure queue", async () => {
      transaction.props.transactionStatus = TransactionStatus.PENDING;
      await transactionCollection.insertOne({
        ...transaction.props,
        _id: transaction.props._id as any,
      });

      // expect that 'ValidatePendingTransactionProcessor' actually subscribed to 'PendingTransactionValidation' queue.
      const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
      expect(subscribedQueueName).toBe(TransactionQueueName.PendingTransactionValidation);
      expect(processor).toBeInstanceOf(ValidatePendingTransactionProcessor);

      when(transactionService.validatePendingTransaction(anything(), anything())).thenResolve(
        PendingTransactionValidationStatus.FAIL,
      );

      when(consumerService.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(sqsClient.enqueue(anything(), anything())).thenResolve("");
      when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
      when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

      await validatePendingTransaction.processMessage(transaction.props._id);

      const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allTransactionsInDb).toHaveLength(1);
      expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.VALIDATION_FAILED);
      expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toEqual(transaction.props.lastStatusUpdateTimestamp);

      const [queueName, transactionId] = capture(sqsClient.enqueue).last();
      expect(queueName).toBe(TransactionQueueName.TransactionFailed);
      expect(transactionId).toBe(transaction.props._id);
    });

    it("should put it in failure queue when validation service throws error", async () => {
      transaction.props.transactionStatus = TransactionStatus.PENDING;
      await transactionCollection.insertOne({
        ...transaction.props,
        _id: transaction.props._id as any,
      });

      // expect that 'ValidatePendingTransactionProcessor' actually subscribed to 'PendingTransactionValidation' queue.
      const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
      expect(subscribedQueueName).toBe(TransactionQueueName.PendingTransactionValidation);
      expect(processor).toBeInstanceOf(ValidatePendingTransactionProcessor);

      when(transactionService.validatePendingTransaction(anything(), anything())).thenReject(
        new TransactionSubmissionException(
          TransactionSubmissionFailureExceptionText.INVALID_WALLET,
          "Invalid wallet",
          "Wallet not sanctioned",
        ),
      );

      when(consumerService.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(sqsClient.enqueue(anything(), anything())).thenResolve("");
      when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
      when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

      await validatePendingTransaction.processMessage(transaction.props._id);

      const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allTransactionsInDb).toHaveLength(1);
      expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.VALIDATION_FAILED);
      expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toEqual(transaction.props.lastStatusUpdateTimestamp);

      const [queueName, transactionId] = capture(sqsClient.enqueue).last();
      expect(queueName).toBe(TransactionQueueName.TransactionFailed);
      expect(transactionId).toBe(transaction.props._id);
    });
  });
});
