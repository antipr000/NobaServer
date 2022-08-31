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
import { EmailService } from "../../../common/email.service";
import { getMockEmailServiceWithDefaults } from "../../../common/mocks/mock.email.service";
import { ConsumerService } from "../../../consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../consumer/mocks/mock.consumer.service";
import { AssetService } from "../../assets/asset.service";
import { AssetServiceFactory } from "../../assets/asset.service.factory";
import { ConsumerWalletTransferStatus, FundsAvailabilityResponse, PollStatus } from "../../domain/AssetTypes";
import { Transaction, TransactionProps } from "../../domain/Transaction";
import { TransactionQueueName, TransactionStatus } from "../../domain/Types";
import {
  getMockAssetServiceFactoryWithDefaultAssetService,
  getMockAssetServiceWithDefaults,
} from "../../mocks/mock.asset.service";
import { getMockSqsClientWithDefaults } from "../../mocks/mock.sqs.client";
import { getMockTransactionServiceWithDefaults } from "../../mocks/mock.transactions.repo";
import { OnChainPendingProcessor } from "../../queueprocessors/OnChainPendingProcessor";
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

describe("OnChainPendingProcessor", () => {
  jest.setTimeout(1000000);

  let consumerService: ConsumerService;
  let assetServiceFactory: AssetServiceFactory;
  let assetService: AssetService;

  let sqsClient: SqsClient;
  let transactionService: TransactionService;
  let onChainPendingProcessor: OnChainPendingProcessor;

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let transactionCollection: Collection;
  let verificationService: VerificationService;
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
    verificationService = getMockVerificationServiceWithDefaults();
    transactionService = getMockTransactionServiceWithDefaults();
    sqsClient = getMockSqsClientWithDefaults();
    lockService = getMockLockServiceWithDefaults();
    assetServiceFactory = getMockAssetServiceFactoryWithDefaultAssetService();
    assetService = getMockAssetServiceWithDefaults();
    emailService = getMockEmailServiceWithDefaults();

    // This behaviour is in the 'beforeEach' because `OnChainPendingProcessor` will be initiated
    // by Nest in the `createTestingModule()` method.
    // As we are subscribing to the queue in the constructor of `MessageProcessor`, the call
    // to `sqsClient.subscribeToQueue()` will be made and we don't want that to fail :)
    when(sqsClient.subscribeToQueue(TransactionQueueName.OnChainPendingTransaction, anything())).thenReturn({
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
        {
          provide: EmailService,
          useFactory: () => instance(emailService),
        },
        OnChainPendingProcessor,
      ],
    }).compile();

    onChainPendingProcessor = app.get<OnChainPendingProcessor>(OnChainPendingProcessor);

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
    zhWithdrawalID: "010101",
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

  it("should not process a transaction that's not in CRYPTO_OUTGOING_COMPLETED status", async () => {
    // expect that 'OnChainPendingProcessor' actually subscribed to 'OnChainPendingTransaction' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.OnChainPendingTransaction);
    expect(processor).toBeInstanceOf(OnChainPendingProcessor);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.PENDING,
      _id: transaction.props._id as any,
    });
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    await onChainPendingProcessor.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.PENDING);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });

  it("should process a transaction that's in CRYPTO_OUTGOING_COMPLETED status", async () => {
    // expect that 'OnChainPendingProcessor' actually subscribed to 'OnChainPendingTransaction' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.OnChainPendingTransaction);
    expect(processor).toBeInstanceOf(OnChainPendingProcessor);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
      _id: transaction.props._id as any,
    });
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const consumerWalletTransferStatus: ConsumerWalletTransferStatus = {
      status: PollStatus.SUCCESS,
      errorMessage: "",
      requestedAmount: 1,
      settledAmount: 1,
      onChainTransactionID: "xyz",
    };
    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenReturn(assetServiceInstance);
    when(assetService.pollConsumerWalletTransferStatus(transaction.props.zhWithdrawalID)).thenResolve(
      consumerWalletTransferStatus,
    );
    when(
      emailService.sendOrderExecutedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.email,
        anything(),
      ),
    ).thenResolve();
    when(transactionService.callTransactionConfirmWebhook(consumer, anything())).thenResolve();

    await onChainPendingProcessor.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.COMPLETED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
      transaction.props.lastStatusUpdateTimestamp,
    );
  });

  it("should not process a transaction that's in CRYPTO_OUTGOING_COMPLETED status if POLL status is PENDING", async () => {
    // expect that 'OnChainPendingProcessor' actually subscribed to 'OnChainPendingTransaction' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.OnChainPendingTransaction);
    expect(processor).toBeInstanceOf(OnChainPendingProcessor);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
      _id: transaction.props._id as any,
    });
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const consumerWalletTransferStatus: ConsumerWalletTransferStatus = {
      status: PollStatus.PENDING,
      errorMessage: "",
      requestedAmount: 1,
      settledAmount: 1,
      onChainTransactionID: "xyz",
    };
    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenReturn(assetServiceInstance);
    when(assetService.pollConsumerWalletTransferStatus(transaction.props.zhWithdrawalID)).thenResolve(
      consumerWalletTransferStatus,
    );
    when(
      emailService.sendOrderExecutedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.email,
        anything(),
      ),
    ).thenResolve();
    when(transactionService.callTransactionConfirmWebhook(consumer, anything())).thenResolve();

    await onChainPendingProcessor.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.CRYPTO_OUTGOING_COMPLETED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });

  it("should fail transaction that's in CRYPTO_OUTGOING_COMPLETED status if POLL status is FAILED", async () => {
    // expect that 'OnChainPendingProcessor' actually subscribed to 'OnChainPendingTransaction' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.OnChainPendingTransaction);
    expect(processor).toBeInstanceOf(OnChainPendingProcessor);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
      _id: transaction.props._id as any,
    });
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, transaction.props._id)).thenResolve("");
    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const consumerWalletTransferStatus: ConsumerWalletTransferStatus = {
      status: PollStatus.FAILURE,
      errorMessage: "xyz",
      requestedAmount: 1,
      settledAmount: 1,
      onChainTransactionID: "xyz",
    };
    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenReturn(assetServiceInstance);
    when(assetService.pollConsumerWalletTransferStatus(transaction.props.zhWithdrawalID)).thenResolve(
      consumerWalletTransferStatus,
    );
    when(
      emailService.sendOrderExecutedEmail(
        consumer.props.firstName,
        consumer.props.lastName,
        consumer.props.email,
        anything(),
      ),
    ).thenResolve();
    when(transactionService.callTransactionConfirmWebhook(consumer, anything())).thenResolve();

    await onChainPendingProcessor.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FAILED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });
});
