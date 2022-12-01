import { Test, TestingModule } from "@nestjs/testing";
import { Collection, MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { CurrencyService } from "../../../common/currency.service";
import { anything, capture, deepEqual, instance, when } from "ts-mockito";
import {
  MONGO_CONFIG_KEY,
  MONGO_URI,
  NODE_ENV_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { DBProvider } from "../../../../infraproviders/DBProvider";
import { ObjectType } from "../../../common/domain/ObjectType";
import { LockService } from "../../../common/lock.service";
import { getMockLockServiceWithDefaults } from "../../../common/mocks/mock.lock.service";
import { Consumer } from "../../../consumer/domain/Consumer";
import { PaymentMethod, PaymentMethodType } from "../../../consumer/domain/PaymentMethod";
import { PaymentMethodStatus } from "../../../consumer/domain/VerificationStatus";
import { getMockVerificationServiceWithDefaults } from "../../../verification/mocks/mock.verification.service";
import { VerificationService } from "../../../verification/verification.service";
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
import { SqsClient } from "../../queueprocessors/sqs.client";
import { MongoDBTransactionRepo } from "../../repo/MongoDBTransactionRepo";
import { TransactionService } from "../../transaction.service";
import { getMockCurrencyServiceWithDefaults } from "../../../common/mocks/mock.currency.service";
import { PaymentProvider } from "../../../consumer/domain/PaymentProvider";
import { getMockPartnerServiceWithDefaults } from "../../../partner/mocks/mock.partner.service";
import { PartnerService } from "../../../partner/partner.service";
import { Partner } from "../../../partner/domain/Partner";
import { InternalTransferInitiator } from "../../queueprocessors/InternalTransferInitiator";
import { WalletProviderService } from "../../assets/wallet.provider.service";
import { getMockWalletProviderServiceWithDefaults } from "../../mocks/mock.wallet.provider.service";
import { InternalTransferStatusProcessor } from "../../queueprocessors/InternalTransferStatusProcessor";

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

describe("InternalTransferInitiator", () => {
  jest.setTimeout(1000000);

  let consumerService: ConsumerService;
  let assetServiceFactory: AssetServiceFactory;
  let assetService: AssetService;
  let walletProviderService: WalletProviderService;

  let sqsClient: SqsClient;
  let transactionService: TransactionService;
  let internalTransferStatusProcessor: InternalTransferStatusProcessor;

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let transactionCollection: Collection;
  let verificationService: VerificationService;
  let lockService: LockService;
  let currencyService: CurrencyService;
  let partnerService: PartnerService;
  let assetServiceInstance: AssetService;

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
    walletProviderService = getMockWalletProviderServiceWithDefaults();
    currencyService = getMockCurrencyServiceWithDefaults();
    partnerService = getMockPartnerServiceWithDefaults();

    // This behaviour is in the 'beforeEach' because `InternalTransferInitiated` will be initiated
    // by Nest in the `createTestingModule()` method.
    // As we are subscribing to the queue in the constructor of `MessageProcessor`, the call
    // to `sqsClient.subscribeToQueue()` will be made and we don't want that to fail :)
    when(sqsClient.subscribeToQueue(TransactionQueueName.InternalTransferInitiated, anything())).thenReturn({
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
          provide: CurrencyService,
          useFactory: () => instance(currencyService),
        },
        {
          provide: PartnerService,
          useFactory: () => instance(partnerService),
        },
        InternalTransferStatusProcessor,
      ],
    }).compile();

    internalTransferStatusProcessor = app.get<InternalTransferStatusProcessor>(InternalTransferStatusProcessor);

    assetServiceInstance = instance(assetService);
    const walletProviderServiceInstance = instance(walletProviderService);
    when(assetServiceFactory.getWalletProviderService()).thenReturn(walletProviderServiceInstance);
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
  const consumerID = "UUUUUUUUUU";
  const paymentMethodID = "XXXXXXXXXX";
  const noDiscountPartnerID = "Partner-1234";

  const transaction = {
    _id: "1111111111" as any,
    userId: consumerID,
    transactionStatus: TransactionStatus.INTERNAL_TRANSFER_PENDING,
    paymentMethodID: paymentMethodID,
    leg1Amount: 1000,
    leg2Amount: 1.234,
    leg1: "USD",
    leg2: cryptocurrency,
    partnerID: noDiscountPartnerID,
    exchangeRate: 1,
    amountPreSpread: 1000,
    cryptoTransactionId: "CryptoTransID-12345",
    transactionTimestamp: new Date(),
    lastProcessingTimestamp: Date.now().valueOf(),
    lastStatusUpdateTimestamp: Date.now().valueOf(),
  };
  const paymentMethod: PaymentMethod = {
    type: PaymentMethodType.CARD,
    status: PaymentMethodStatus.APPROVED,
    cardData: {
      first6Digits: "123456",
      last4Digits: "4321",
    },
    imageUri: "...",
    paymentToken: "XXXXXXXXXX",
    paymentProviderID: PaymentProvider.CHECKOUT,
    isDefault: false,
  };
  const consumer: Consumer = Consumer.createConsumer({
    _id: consumerID,
    email: "test@noba.com",
    partners: [
      {
        partnerID: noDiscountPartnerID,
      },
    ],
    paymentMethods: [paymentMethod],
    zhParticipantCode: "zh-participant-code",
  });

  const noDiscountPartner: Partner = Partner.createPartner({
    _id: noDiscountPartnerID,
    name: "Noba",
    config: {
      notificationConfig: undefined,
      fees: {
        creditCardFeeDiscountPercent: 0,
        networkFeeDiscountPercent: 0,
        nobaFeeDiscountPercent: 0,
        processingFeeDiscountPercent: 0,
        spreadDiscountPercent: 0,
        takeRate: 0,
      },
    },
  });

  const fundsAvailabilityResponse: FundsAvailabilityResponse = {
    transferID: "123",
    transferredCrypto: cryptoAmount,
    cryptocurrency: cryptocurrency,
  };

  // TODO(#): Have an independent 'transaction' instance here & check for the final transaction state.
  it("should not process a transaction that's not in INTERNAL_TRANSFER_PENDING status", async () => {
    // expect that 'InternalTransferStatusProcessor' actually subscribed to 'InternalTransferInitiated' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.InternalTransferInitiated);
    expect(processor).toBeInstanceOf(InternalTransferStatusProcessor);

    await transactionCollection.insertOne({
      ...transaction,
      transactionStatus: TransactionStatus.PENDING,
      _id: transaction._id as any,
    });

    await internalTransferStatusProcessor.processMessageInternal(transaction._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.PENDING);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.lastStatusUpdateTimestamp);
  });

  it("Should keep transaction in the same transaction status if trade status is still PENDING at asset provider", async () => {
    // expect that 'InternalTransferStatusProcessor' actually subscribed to 'InternalTransferInitiated' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.InternalTransferInitiated);
    expect(processor).toBeInstanceOf(InternalTransferStatusProcessor);

    await transactionCollection.insertOne(transaction);

    when(assetServiceFactory.getAssetService(transaction.leg2)).thenResolve(assetServiceInstance);
    when(assetService.pollAssetTransferToConsumerStatus(transaction.cryptoTransactionId)).thenResolve({
      status: PollStatus.PENDING,
      errorMessage: "",
    });

    await internalTransferStatusProcessor.processMessageInternal(transaction._id);
    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.INTERNAL_TRANSFER_PENDING);
    expect(allTransactionsInDb[0]._id).toBe(transaction._id);
  });

  it("Should throw an error and go to failure if trade status is in FAILURE at asset provider", async () => {
    // expect that 'InternalTransferStatusProcessor' actually subscribed to 'InternalTransferInitiated' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.InternalTransferInitiated);
    expect(processor).toBeInstanceOf(InternalTransferStatusProcessor);

    await transactionCollection.insertOne(transaction);

    when(assetServiceFactory.getAssetService(transaction.leg2)).thenResolve(assetServiceInstance);
    when(assetService.pollAssetTransferToConsumerStatus(transaction.cryptoTransactionId)).thenResolve({
      status: PollStatus.FAILURE,
      errorMessage: "Failure",
    });

    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction._id, ObjectType.TRANSACTION)).thenResolve();

    await internalTransferStatusProcessor.processMessageInternal(transaction._id);
    await performFailureAssertions(transactionCollection, sqsClient, transaction._id, "Failure");
  });

  it("Should throw an error and go to failure if trade status is in FATAL_ERROR at asset provider", async () => {
    // expect that 'InternalTransferStatusProcessor' actually subscribed to 'InternalTransferInitiated' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.InternalTransferInitiated);
    expect(processor).toBeInstanceOf(InternalTransferStatusProcessor);

    await transactionCollection.insertOne(transaction);

    when(assetServiceFactory.getAssetService(transaction.leg2)).thenResolve(assetServiceInstance);
    when(assetService.pollAssetTransferToConsumerStatus(transaction.cryptoTransactionId)).thenResolve({
      status: PollStatus.FATAL_ERROR,
      errorMessage: "Fatal Failure",
    });

    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction._id, ObjectType.TRANSACTION)).thenResolve();

    await internalTransferStatusProcessor.processMessageInternal(transaction._id);
    await performFailureAssertions(transactionCollection, sqsClient, transaction._id, "Fatal Failure");
  });

  it("Should process successfully if trade status is SUCCESS at asset provider", async () => {
    // expect that 'InternalTransferStatusProcessor' actually subscribed to 'InternalTransferInitiated' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.InternalTransferInitiated);
    expect(processor).toBeInstanceOf(InternalTransferStatusProcessor);

    await transactionCollection.insertOne(transaction);

    when(assetServiceFactory.getAssetService(transaction.leg2)).thenResolve(assetServiceInstance);
    when(assetService.pollAssetTransferToConsumerStatus(transaction.cryptoTransactionId)).thenResolve({
      status: PollStatus.SUCCESS,
      errorMessage: "",
    });

    await internalTransferStatusProcessor.processMessageInternal(transaction._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.COMPLETED);
  });
});

async function performFailureAssertions(
  transactionCollection,
  sqsClient: SqsClient,
  transactionID: string,
  expectedErrorMsg: string,
) {
  const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
  expect(allTransactionsInDb).toHaveLength(1);
  expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FAILED);
  expect(allTransactionsInDb[0].transactionExceptions.length).toBe(1);
  expect(allTransactionsInDb[0].transactionExceptions[0].details).toEqual(expectedErrorMsg);
  expect(allTransactionsInDb[0].transactionExceptions[0].message).toEqual("Failed to perform internal transfer.");

  const [queueName, transactionId] = capture(sqsClient.enqueue).last();
  expect(queueName).toBe(TransactionQueueName.TransactionFailed);
  expect(transactionId).toBe(transactionID);
}
