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
import { getMockAssetServiceFactoryWithDefaultAssetService } from "../../mocks/mock.asset.service";
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
  let walletProviderService: WalletProviderService;

  let sqsClient: SqsClient;
  let transactionService: TransactionService;
  let internalTransferInitiator: InternalTransferInitiator;

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let transactionCollection: Collection;
  let verificationService: VerificationService;
  let lockService: LockService;
  let currencyService: CurrencyService;
  let partnerService: PartnerService;

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
    walletProviderService = getMockWalletProviderServiceWithDefaults();
    currencyService = getMockCurrencyServiceWithDefaults();
    partnerService = getMockPartnerServiceWithDefaults();

    // This behaviour is in the 'beforeEach' because `InternalTransferInitiator` will be initiated
    // by Nest in the `createTestingModule()` method.
    // As we are subscribing to the queue in the constructor of `MessageProcessor`, the call
    // to `sqsClient.subscribeToQueue()` will be made and we don't want that to fail :)
    when(sqsClient.subscribeToQueue(TransactionQueueName.InternalTransferInitiator, anything())).thenReturn({
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
        InternalTransferInitiator,
      ],
    }).compile();

    internalTransferInitiator = app.get<InternalTransferInitiator>(InternalTransferInitiator);

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

  const cryptocurrency = "ETH";
  const consumerID = "UUUUUUUUUU";
  const paymentMethodID = "XXXXXXXXXX";
  const noDiscountPartnerID = "Partner-1234";

  const transaction = {
    _id: "1111111111" as any,
    userId: consumerID,
    transactionStatus: TransactionStatus.VALIDATION_PASSED,
    paymentMethodID: paymentMethodID,
    leg1Amount: 1000,
    leg2Amount: 1.234,
    leg1: "USD",
    leg2: cryptocurrency,
    partnerID: noDiscountPartnerID,
    exchangeRate: 1,
    amountPreSpread: 1000,
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

  it("should not process a transaction that's not in VALIDATION_PASSED status", async () => {
    // expect that 'InternalTransferInitiator' actually subscribed to 'InternalTransferInitiator' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.InternalTransferInitiator);
    expect(processor).toBeInstanceOf(InternalTransferInitiator);

    await transactionCollection.insertOne({
      ...transaction,
      transactionStatus: TransactionStatus.PENDING,
      _id: transaction._id as any,
    });

    await internalTransferInitiator.processMessageInternal(transaction._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.PENDING);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.lastStatusUpdateTimestamp);
  });

  it("should fail if consumer doesn't have enough balance in their Noba Wallet", async () => {
    // expect that 'InternalTransferInitiator' actually subscribed to 'InternalTransferInitiator' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.InternalTransferInitiator);
    expect(processor).toBeInstanceOf(InternalTransferInitiator);

    await transactionCollection.insertOne(transaction);

    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction._id, ObjectType.TRANSACTION)).thenResolve();

    when(transactionService.getParticipantBalance(consumer.props.zhParticipantCode, cryptocurrency)).thenResolve([
      {
        accountID: "acct-id-1",
        name: "acct-label-1",
        accountType: "available",
        asset: cryptocurrency,
        balance: "0",
        lastUpdate: new Date().getTime(),
      },
    ]);

    await internalTransferInitiator.processMessageInternal(transaction._id);
    await performFailureAssertions(transactionCollection, sqsClient, transaction._id);
  });

  it("should successfully perform trade at liquidity provider", async () => {
    // expect that 'InternalTransferInitiator' actually subscribed to 'InternalTransferInitiator' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.InternalTransferInitiator);
    expect(processor).toBeInstanceOf(InternalTransferInitiator);

    const tradeID = "Trade-13245";
    const transferRequest = {
      consumer: consumer.props,
      cryptoAssetTradePrice: transaction.exchangeRate,
      totalCryptoAmount: transaction.leg2Amount,
      fiatAmountPreSpread: transaction.amountPreSpread,
      totalFiatAmount: transaction.leg1Amount,
      cryptoCurrency: transaction.leg2,
      fiatCurrency: transaction.leg1,
      transactionID: transaction._id,
      transactionCreationTimestamp: transaction.transactionTimestamp,
    };

    when(walletProviderService.transferAssetToNobaAccount(deepEqual(transferRequest))).thenResolve(tradeID);

    await transactionCollection.insertOne(transaction);

    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.InternalTransferInitiated, transaction._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction._id, ObjectType.TRANSACTION)).thenResolve();

    when(transactionService.getParticipantBalance(consumer.props.zhParticipantCode, cryptocurrency)).thenResolve([
      {
        accountID: "acct-id-1",
        name: "acct-label-1",
        accountType: "available",
        asset: cryptocurrency,
        balance: "2000",
        lastUpdate: new Date().getTime(),
      },
    ]);

    await internalTransferInitiator.processMessageInternal(transaction._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.INTERNAL_TRANSFER_PENDING);
    expect(allTransactionsInDb[0].cryptoTransactionId).toBe(tradeID);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(transaction.lastStatusUpdateTimestamp);

    const [queueName, transactionId] = capture(sqsClient.enqueue).last();
    expect(queueName).toBe(TransactionQueueName.InternalTransferInitiated);
    expect(transactionId).toBe(transaction._id);
  });
});

async function performFailureAssertions(transactionCollection, sqsClient: SqsClient, transactionID: string) {
  const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
  expect(allTransactionsInDb).toHaveLength(1);
  expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FAILED);

  const [queueName, transactionId] = capture(sqsClient.enqueue).last();
  expect(queueName).toBe(TransactionQueueName.TransactionFailed);
  expect(transactionId).toBe(transactionID);
}
