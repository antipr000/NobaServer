import { Test, TestingModule } from "@nestjs/testing";
import { Collection, MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { CurrencyService } from "../../../../modules/common/currency.service";
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
import { PaymentMethod, PaymentMethodType } from "../../../../modules/consumer/domain/PaymentMethod";
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
import { getMockCurrencyServiceWithDefaults } from "../../../../modules/common/mocks/mock.currency.service";
import { PaymentProvider } from "../../../../modules/consumer/domain/PaymentProvider";
import { getMockPartnerServiceWithDefaults } from "../../../../modules/partner/mocks/mock.partner.service";
import { PartnerService } from "../../../../modules/partner/partner.service";
import { Partner } from "../../../../modules/partner/domain/Partner";
import { CurrencyType } from "../../../../modules/common/domain/Types";

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
    assetService = getMockAssetServiceWithDefaults();
    currencyService = getMockCurrencyServiceWithDefaults();
    partnerService = getMockPartnerServiceWithDefaults();

    // This behaviour is in the 'beforeEach' because `CryptoTransactionInitiator` will be initiated
    // by Nest in the `createTestingModule()` method.
    // As we are subscribing to the queue in the constructor of `MessageProcessor`, the call
    // to `sqsClient.subscribeToQueue()` will be made and we don't want that to fail :)
    when(sqsClient.subscribeToQueue(TransactionQueueName.FiatTransactionCompleted, anything())).thenReturn({
      // eslint-disable-next-line @typescript-eslint/no-empty-function
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
  const amountPreSpread = 0;
  const processingFeeInFiat = 0;
  const networkFeeInFiat = 0;
  const nobaFeeInFiat = 0;
  const quotedFiatAmount = 0;
  const totalFiatAmount = 0;
  const totalCryptoQuantity = 0;
  const perUnitCryptoPriceWithoutSpread = 0;
  const perUnitCryptoPriceWithSpread = 0;

  const cryptocurrency = "ETH";
  const initiatedPaymentId = "CCCCCCCCCC";
  const consumerID = "UUUUUUUUUU";
  const paymentMethodID = "XXXXXXXXXX";
  const noDiscountPartnerID = "Partner-1234";

  const transaction: Transaction = Transaction.createTransaction({
    _id: "1111111111",
    userId: consumerID,
    transactionStatus: TransactionStatus.VALIDATION_PASSED,
    paymentMethodID: paymentMethodID,
    leg1Amount: 1000,
    leg2Amount: cryptoAmount,
    leg1: "USD",
    leg2: cryptocurrency,
    partnerID: noDiscountPartnerID,
    lastProcessingTimestamp: Date.now().valueOf(),
    lastStatusUpdateTimestamp: Date.now().valueOf(),
  });
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

  // TODO(#): Have an independent 'transaction' instance here & check for the final transaction state.
  it("should process a transaction in FIAT_INCOMING_COMPLETED status & update the quote parameters and discounts", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    await transactionCollection.insertOne({
      _id: "1111111111" as any,
      userId: consumerID,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      paymentMethodID: paymentMethodID,
      leg1Amount: 1000,
      leg2Amount: 1.234,
      leg1: "USD",
      leg2: cryptocurrency,
      partnerID: noDiscountPartnerID,
      lastProcessingTimestamp: Date.now().valueOf(),
      lastStatusUpdateTimestamp: Date.now().valueOf(),
    });

    when(currencyService.getCryptocurrency(cryptocurrency)).thenResolve({
      ticker: cryptocurrency,
      provider: "Zerohash",
      iconPath: "",
      precision: 0,
      name: "Ethereum",
    });
    when(partnerService.getPartner(noDiscountPartnerID)).thenResolve(noDiscountPartner);
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenResolve(assetServiceInstance);
    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.SUCCESS,
      errorMessage: "",
      settledId: "123",
    });
    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      tradeID: "quote_trade_id",
      tradePrice: 12345,
      cryptoReceived: cryptoAmount,
      quote: {
        quote: {
          quoteID: "raw_quote_id",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",
          amountPreSpread: 90,
          processingFeeInFiat: 10,
          networkFeeInFiat: 11,
          nobaFeeInFiat: 12,
          quotedFiatAmount: 100,
          totalFiatAmount: 133,
          totalCryptoQuantity: 0.9,
          perUnitCryptoPriceWithoutSpread: 100,
          perUnitCryptoPriceWithSpread: 111.11,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",
          amountPreSpread: 90,
          processingFeeInFiat: 5,
          networkFeeInFiat: 5.5,
          nobaFeeInFiat: 6,
          quotedFiatAmount: 100,
          totalFiatAmount: 116.5,
          perUnitCryptoPriceWithoutSpread: 100,
          perUnitCryptoPriceWithSpread: 111.11,
        },
        discountsGiven: {
          creditCardFeeDiscount: 2,
          networkFeeDiscount: 5.5,
          nobaFeeDiscount: 6,
          processingFeeDiscount: 3,
          spreadDiscount: 0,
        },
      },
    });

    when(assetService.pollExecuteQuoteForFundsAvailabilityStatus("quote_trade_id")).thenResolve({
      errorMessage: null,
      settledTimestamp: 908070605040,
      status: PollStatus.SUCCESS,
    });
    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("12345");

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.CRYPTO_OUTGOING_INITIATED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
      transaction.props.lastStatusUpdateTimestamp,
    );
    expect(allTransactionsInDb[0].executedQuoteTradeID).toBe("quote_trade_id");
    expect(allTransactionsInDb[0].executedQuoteSettledTimestamp).toBe(908070605040);

    // Quote parameters
    expect(allTransactionsInDb[0].tradeQuoteID).toBe("raw_quote_id");
    expect(allTransactionsInDb[0].nobaFee).toBe(12);
    expect(allTransactionsInDb[0].networkFee).toBe(11);
    expect(allTransactionsInDb[0].processingFee).toBe(10);
    expect(allTransactionsInDb[0].exchangeRate).toBe(111.11);
    expect(allTransactionsInDb[0].amountPreSpread).toBe(90);

    expect(allTransactionsInDb[0].discounts.dynamicCreditCardFeeDiscount).toBe(3);
    expect(allTransactionsInDb[0].discounts.fixedCreditCardFeeDiscount).toBe(2);
    expect(allTransactionsInDb[0].discounts.nobaFeeDiscount).toBe(6);
    expect(allTransactionsInDb[0].discounts.networkFeeDiscount).toBe(5.5);
    expect(allTransactionsInDb[0].discounts.spreadDiscount).toBe(0);
  });

  it("should process a transaction in FIAT_INCOMING_COMPLETED status & update the quote parameters and discounts based on the partner config", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    const discountPartnerID = "DiscountPartner-12345";
    const discountPartner: Partner = Partner.createPartner({
      _id: discountPartnerID,
      name: "Noba",
      config: {
        notificationConfig: undefined,
        fees: {
          creditCardFeeDiscountPercent: 0.1,
          networkFeeDiscountPercent: 0.2,
          nobaFeeDiscountPercent: 0.3,
          processingFeeDiscountPercent: 0.4,
          spreadDiscountPercent: 0.5,
          takeRate: 0,
        },
      },
    });

    await transactionCollection.insertOne({
      _id: "1111111111" as any,
      userId: consumerID,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      paymentMethodID: paymentMethodID,
      leg1Amount: 1000,
      leg2Amount: 1.234,
      leg1: "USD",
      leg2: cryptocurrency,
      partnerID: discountPartnerID,
      lastProcessingTimestamp: Date.now().valueOf(),
      lastStatusUpdateTimestamp: Date.now().valueOf(),
    });

    when(currencyService.getCryptocurrency(cryptocurrency)).thenResolve({
      ticker: cryptocurrency,
      provider: "Zerohash",
      iconPath: "",
      precision: 0,
      name: "Ethereum",
    });
    when(partnerService.getPartner(discountPartnerID)).thenResolve(discountPartner);
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenResolve(assetServiceInstance);
    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.SUCCESS,
      errorMessage: "",
      settledId: "123",
    });
    when(
      assetService.executeQuoteForFundsAvailability(
        /*{
        consumer: anything(),
        cryptoCurrency: "ETH",
        fiatCurrency: "USD",
        cryptoQuantity: 1.234,
        fiatAmount: 1000,
        slippage: 0,
        fixedSide: CurrencyType.FIAT,
        transactionCreationTimestamp: anything(),
        transactionID: "1111111111",
        discount: {
          fixedCreditCardFeeDiscountPercent: 0.1,
          networkFeeDiscountPercent: 0.2,
          nobaFeeDiscountPercent: 0.3,
          nobaSpreadDiscountPercent: 0.5,
          processingFeeDiscountPercent: 0.4,
        },
      }*/ anything(),
      ),
    ).thenResolve({
      tradeID: "quote_trade_id",
      tradePrice: 12345,
      cryptoReceived: cryptoAmount,
      quote: {
        quote: {
          quoteID: "raw_quote_id",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",
          amountPreSpread: 90,
          processingFeeInFiat: 10,
          networkFeeInFiat: 11,
          nobaFeeInFiat: 12,
          quotedFiatAmount: 100,
          totalFiatAmount: 133,
          totalCryptoQuantity: 0.9,
          perUnitCryptoPriceWithoutSpread: 100,
          perUnitCryptoPriceWithSpread: 111.11,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",
          amountPreSpread: 90,
          processingFeeInFiat: 5,
          networkFeeInFiat: 5.5,
          nobaFeeInFiat: 6,
          quotedFiatAmount: 100,
          totalFiatAmount: 116.5,
          perUnitCryptoPriceWithoutSpread: 100,
          perUnitCryptoPriceWithSpread: 111.11,
        },
        discountsGiven: {
          creditCardFeeDiscount: 2,
          networkFeeDiscount: 5.5,
          nobaFeeDiscount: 6,
          processingFeeDiscount: 3,
          spreadDiscount: 0,
        },
      },
    });

    when(assetService.pollExecuteQuoteForFundsAvailabilityStatus("quote_trade_id")).thenResolve({
      errorMessage: null,
      settledTimestamp: 908070605040,
      status: PollStatus.SUCCESS,
    });
    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("12345");

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.CRYPTO_OUTGOING_INITIATED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBeGreaterThan(
      transaction.props.lastStatusUpdateTimestamp,
    );
    expect(allTransactionsInDb[0].executedQuoteTradeID).toBe("quote_trade_id");
    expect(allTransactionsInDb[0].executedQuoteSettledTimestamp).toBe(908070605040);

    // Quote parameters
    expect(allTransactionsInDb[0].tradeQuoteID).toBe("raw_quote_id");
    expect(allTransactionsInDb[0].nobaFee).toBe(12);
    expect(allTransactionsInDb[0].networkFee).toBe(11);
    expect(allTransactionsInDb[0].processingFee).toBe(10);
    expect(allTransactionsInDb[0].exchangeRate).toBe(111.11);
    expect(allTransactionsInDb[0].amountPreSpread).toBe(90);

    expect(allTransactionsInDb[0].discounts.dynamicCreditCardFeeDiscount).toBe(3);
    expect(allTransactionsInDb[0].discounts.fixedCreditCardFeeDiscount).toBe(2);
    expect(allTransactionsInDb[0].discounts.nobaFeeDiscount).toBe(6);
    expect(allTransactionsInDb[0].discounts.networkFeeDiscount).toBe(5.5);
    expect(allTransactionsInDb[0].discounts.spreadDiscount).toBe(0);
  });

  // TODO(#): Have an independent 'transaction' instance here & check for the final transaction state.
  it("If fund availability is PENDING then do nothing", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      _id: transaction.props._id as any,
    });
    when(currencyService.getCryptocurrency(cryptocurrency)).thenResolve({
      ticker: cryptocurrency,
      provider: "Zerohash",
      iconPath: "",
      precision: 0,
      name: "Ethereum",
    });
    when(partnerService.getPartner(noDiscountPartnerID)).thenResolve(noDiscountPartner);
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.CryptoTransactionInitiated, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenResolve(assetServiceInstance);
    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      tradeID: "quote_trade_id",
      tradePrice: 12345,
      cryptoReceived: cryptoAmount,
      quote: {
        quote: {
          quoteID: "12345",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",
          amountPreSpread,
          processingFeeInFiat,
          networkFeeInFiat,
          nobaFeeInFiat,
          quotedFiatAmount,
          totalFiatAmount,
          totalCryptoQuantity,
          perUnitCryptoPriceWithoutSpread,
          perUnitCryptoPriceWithSpread,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",
          amountPreSpread,
          processingFeeInFiat,
          networkFeeInFiat,
          nobaFeeInFiat,
          quotedFiatAmount,
          totalFiatAmount,
          perUnitCryptoPriceWithoutSpread,
          perUnitCryptoPriceWithSpread,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      },
    });
    when(assetService.pollExecuteQuoteForFundsAvailabilityStatus("quote_trade_id")).thenResolve({
      errorMessage: null,
      settledTimestamp: 908070605040,
      status: PollStatus.SUCCESS,
    });
    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.PENDING,
      errorMessage: "",
      settledId: "123",
    });

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_COMPLETED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });

  // TODO(#): Have an independent 'transaction' instance here & check for the final transaction state.
  it("shouldn't re-execute the quote and just poll on executedQuoteTradeId", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      _id: transaction.props._id as any,
      executedQuoteTradeID: "quote_trade_id",
      executedCrypto: 98765,
    });
    when(partnerService.getPartner(noDiscountPartnerID)).thenResolve(noDiscountPartner);
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenResolve(assetServiceInstance);
    when(assetService.pollExecuteQuoteForFundsAvailabilityStatus("quote_trade_id")).thenResolve({
      errorMessage: null,
      settledTimestamp: 908070605040,
      status: PollStatus.SUCCESS,
    });
    when(currencyService.getCryptocurrency(cryptocurrency)).thenResolve({
      ticker: cryptocurrency,
      provider: "Zerohash",
      iconPath: "",
      precision: 0,
      name: "Ethereum",
    });
    when(assetService.makeFundsAvailable(anything())).thenResolve({
      transferID: "noba_account_transfer_id",
      transferredCrypto: 98765,
      cryptocurrency: cryptocurrency,
    });
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.PENDING,
      errorMessage: "",
      settledId: "123",
    });

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_COMPLETED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
    expect(allTransactionsInDb[0].executedQuoteTradeID).toBe("quote_trade_id");
    expect(allTransactionsInDb[0].nobaTransferTradeID).toBe("noba_account_transfer_id");
  });

  // TODO(#): Have an independent 'transaction' instance here & check for the final transaction state.
  it("shouldn't re-poll the quote trade if 'executedQuoteSettledTimestamp' is already set", async () => {
    // expect that 'CryptoTransactionInitiator' actually subscribed to 'FiatTransactionCompleted' queue.
    const [subscribedQueueName, processor] = capture(sqsClient.subscribeToQueue).last();
    expect(subscribedQueueName).toBe(TransactionQueueName.FiatTransactionCompleted);
    expect(processor).toBeInstanceOf(CryptoTransactionInitiator);

    await transactionCollection.insertOne({
      ...transaction.props,
      transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
      _id: transaction.props._id as any,
      executedQuoteTradeID: "quote_trade_id",
      executedCrypto: 98765,
      executedQuoteSettledTimestamp: 9873214560,
    });
    when(partnerService.getPartner(noDiscountPartnerID)).thenResolve(noDiscountPartner);
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();
    when(currencyService.getCryptocurrency(cryptocurrency)).thenResolve({
      ticker: cryptocurrency,
      provider: "Zerohash",
      iconPath: "",
      precision: 0,
      name: "Ethereum",
    });

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenResolve(assetServiceInstance);

    when(assetService.makeFundsAvailable(anything())).thenResolve({
      transferID: "noba_account_transfer_id",
      transferredCrypto: 98765,
      cryptocurrency: cryptocurrency,
    });
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.PENDING,
      errorMessage: "",
      settledId: "123",
    });

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FIAT_INCOMING_COMPLETED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
    expect(allTransactionsInDb[0].executedQuoteTradeID).toBe("quote_trade_id");
    expect(allTransactionsInDb[0].executedQuoteSettledTimestamp).toBe(9873214560);
    expect(allTransactionsInDb[0].nobaTransferTradeID).toBe("noba_account_transfer_id");
  });

  // TODO(#): Have an independent 'transaction' instance here & check for the final transaction state.
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
    when(partnerService.getPartner(noDiscountPartnerID)).thenResolve(noDiscountPartner);
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transaction.props._id)).thenResolve("");
    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();
    when(currencyService.getCryptocurrency(cryptocurrency)).thenResolve({
      ticker: cryptocurrency,
      provider: "Zerohash",
      iconPath: "",
      precision: 0,
      name: "Ethereum",
    });

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenResolve(assetServiceInstance);
    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      quote: {
        quote: {
          quoteID: "executed_quote_id",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",
          amountPreSpread,
          processingFeeInFiat,
          networkFeeInFiat,
          nobaFeeInFiat,
          quotedFiatAmount,
          totalFiatAmount,
          totalCryptoQuantity,
          perUnitCryptoPriceWithoutSpread,
          perUnitCryptoPriceWithSpread,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",
          amountPreSpread,
          processingFeeInFiat,
          networkFeeInFiat,
          nobaFeeInFiat,
          quotedFiatAmount,
          totalFiatAmount,
          perUnitCryptoPriceWithoutSpread,
          perUnitCryptoPriceWithSpread,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      },
      tradePrice: 12345,
      cryptoReceived: cryptoAmount,
      tradeID: "exectued_quote_trade_id",
    });
    when(assetService.pollExecuteQuoteForFundsAvailabilityStatus("exectued_quote_trade_id")).thenResolve({
      errorMessage: null,
      settledTimestamp: 908070605040,
      status: PollStatus.SUCCESS,
    });

    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.FAILURE,
      errorMessage: "test error msg",
      settledId: "123",
    });

    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("consumer_trade_id");

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
    when(partnerService.getPartner(noDiscountPartnerID)).thenResolve(noDiscountPartner);
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transaction.props._id)).thenResolve("");
    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");

    when(currencyService.getCryptocurrency(cryptocurrency)).thenResolve({
      ticker: cryptocurrency,
      provider: "Zerohash",
      iconPath: "",
      precision: 0,
      name: "Ethereum",
    });
    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenResolve(assetServiceInstance);
    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      quote: {
        quote: {
          quoteID: "quote_id",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",
          amountPreSpread,
          processingFeeInFiat,
          networkFeeInFiat,
          nobaFeeInFiat,
          quotedFiatAmount,
          totalFiatAmount,
          totalCryptoQuantity,
          perUnitCryptoPriceWithoutSpread,
          perUnitCryptoPriceWithSpread,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",
          amountPreSpread,
          processingFeeInFiat,
          networkFeeInFiat,
          nobaFeeInFiat,
          quotedFiatAmount,
          totalFiatAmount,
          perUnitCryptoPriceWithoutSpread,
          perUnitCryptoPriceWithSpread,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      },
      tradePrice: 12345,
      cryptoReceived: cryptoAmount,
      tradeID: "exectued_quote_trade_id",
    });
    when(assetService.pollExecuteQuoteForFundsAvailabilityStatus("exectued_quote_trade_id")).thenResolve({
      errorMessage: null,
      settledTimestamp: 908070605040,
      status: PollStatus.SUCCESS,
    });

    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.FATAL_ERROR,
      errorMessage: "test error msg",
      settledId: "123",
    });

    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("12345");

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FAILED);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
    expect(allTransactionsInDb[0].executedQuoteSettledTimestamp).toBe(908070605040);
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
    when(partnerService.getPartner(noDiscountPartnerID)).thenResolve(noDiscountPartner);
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transaction.props._id)).thenResolve("");
    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    when(currencyService.getCryptocurrency(cryptocurrency)).thenResolve({
      ticker: cryptocurrency,
      provider: "Zerohash",
      iconPath: "",
      precision: 0,
      name: "Ethereum",
    });
    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenResolve(assetServiceInstance);

    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      quote: {
        quote: {
          quoteID: "quote_id",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",
          amountPreSpread,
          processingFeeInFiat,
          networkFeeInFiat,
          nobaFeeInFiat,
          quotedFiatAmount,
          totalFiatAmount,
          totalCryptoQuantity,
          perUnitCryptoPriceWithoutSpread,
          perUnitCryptoPriceWithSpread,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",
          amountPreSpread,
          processingFeeInFiat,
          networkFeeInFiat,
          nobaFeeInFiat,
          quotedFiatAmount,
          totalFiatAmount,
          perUnitCryptoPriceWithoutSpread,
          perUnitCryptoPriceWithSpread,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      },
      tradePrice: 12345,
      cryptoReceived: cryptoAmount * 2,
      tradeID: "exectued_quote_trade_id",
    });
    when(assetService.pollExecuteQuoteForFundsAvailabilityStatus("exectued_quote_trade_id")).thenResolve({
      errorMessage: null,
      settledTimestamp: 908070605040,
      status: PollStatus.SUCCESS,
    });

    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.FATAL_ERROR,
      errorMessage: "test error msg",
      settledId: "123",
    });

    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("12345");

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FAILED);
    expect(allTransactionsInDb[0].executedQuoteSettledTimestamp).toBe(908070605040);
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
    when(currencyService.getCryptocurrency(cryptocurrency)).thenResolve({
      ticker: cryptocurrency,
      provider: "Zerohash",
      iconPath: "",
      precision: 0,
      name: "Ethereum",
    });
    when(partnerService.getPartner(noDiscountPartnerID)).thenResolve(noDiscountPartner);
    when(consumerService.getConsumer(consumerID)).thenResolve(consumer);
    when(sqsClient.enqueue(TransactionQueueName.FiatTransactionInitiated, transaction.props._id)).thenResolve("");
    when(sqsClient.enqueue(TransactionQueueName.TransactionFailed, transaction.props._id)).thenResolve("");
    when(lockService.acquireLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve("lock-1");
    when(lockService.releaseLockForKey(transaction.props._id, ObjectType.TRANSACTION)).thenResolve();

    const assetServiceInstance = instance(assetService);
    when(assetServiceFactory.getAssetService(transaction.props.leg2)).thenResolve(assetServiceInstance);

    when(assetService.executeQuoteForFundsAvailability(anything())).thenResolve({
      quote: {
        quote: {
          quoteID: "quote_id",
          fiatCurrency: "USD",
          cryptoCurrency: "ETH",
          amountPreSpread,
          processingFeeInFiat,
          networkFeeInFiat,
          nobaFeeInFiat,
          quotedFiatAmount,
          totalFiatAmount,
          totalCryptoQuantity,
          perUnitCryptoPriceWithoutSpread,
          perUnitCryptoPriceWithSpread,
        },
        nonDiscountedQuote: {
          fiatCurrency: "USD",
          amountPreSpread,
          processingFeeInFiat,
          networkFeeInFiat,
          nobaFeeInFiat,
          quotedFiatAmount,
          totalFiatAmount,
          perUnitCryptoPriceWithoutSpread,
          perUnitCryptoPriceWithSpread,
        },
        discountsGiven: {
          creditCardFeeDiscount: 0,
          networkFeeDiscount: 0,
          nobaFeeDiscount: 0,
          processingFeeDiscount: 0,
          spreadDiscount: 0,
        },
      },
      tradePrice: 12345,
      cryptoReceived: cryptoAmount,
      tradeID: "exectued_quote_trade_id",
    });
    when(assetService.pollExecuteQuoteForFundsAvailabilityStatus("exectued_quote_trade_id")).thenResolve({
      errorMessage: null,
      settledTimestamp: 908070605040,
      status: PollStatus.SUCCESS,
    });

    when(assetService.makeFundsAvailable(anything())).thenResolve(fundsAvailabilityResponse);
    when(assetService.pollFundsAvailableStatus(anything())).thenResolve({
      status: PollStatus.FATAL_ERROR,
      errorMessage: "test error msg",
      settledId: "123",
    });

    when(assetService.transferAssetToConsumerAccount(anything())).thenResolve("12345");

    await cryptoTransactionInitiator.processMessageInternal(transaction.props._id);

    const allTransactionsInDb = await getAllRecordsInTransactionCollection(transactionCollection);
    expect(allTransactionsInDb).toHaveLength(1);
    expect(allTransactionsInDb[0].transactionStatus).toBe(TransactionStatus.FAILED);
    expect(allTransactionsInDb[0].executedQuoteSettledTimestamp).toBe(908070605040);
    expect(allTransactionsInDb[0].lastStatusUpdateTimestamp).toBe(transaction.props.lastStatusUpdateTimestamp);
  });
});
