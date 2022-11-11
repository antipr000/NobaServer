import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient, Collection } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { Transaction, TransactionProps } from "../../../modules/transactions/domain/Transaction";
import { TransactionMigrator } from "../../../infraproviders/migrators/transaction.migrator";

const getAllRecordsInTransactionCollection = async (transactionCollection: Collection): Promise<Array<Transaction>> => {
  const consumerDocumentsCursor = transactionCollection.find({});
  const allRecords: Transaction[] = [];

  while (await consumerDocumentsCursor.hasNext()) {
    const transactionDocument = await consumerDocumentsCursor.next();

    const currentRecord: Transaction = Transaction.createTransaction({
      ...transactionDocument,
      _id: transactionDocument._id as any,
    });
    allRecords.push(currentRecord);
  }

  return allRecords;
};

describe("ConsumerMigrator", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let transactionCollection: Collection;

  let transactionMigrator: TransactionMigrator;

  beforeEach(async () => {
    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    console.log("MongoMemoryServer running at: ", mongoUri);

    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************
    /**
     *
     * This will be used to configure the testing module and will decouple
     * the testing module from the actual module.
     *
     * Never hard-code the environment variables "KEY_NAME" in the testing module.
     * All the keys used in 'appconfigs' are defined in
     * `config/ConfigurationUtils` and it should be used for all the testing modules.
     *
     **/
    const appConfigurations = {
      [MONGO_CONFIG_KEY]: {
        [MONGO_URI]: mongoUri,
      },
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [DBProvider, TransactionMigrator],
    }).compile();

    transactionMigrator = app.get<TransactionMigrator>(TransactionMigrator);

    // Setup a mongodb client for interacting with "consumers" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    transactionCollection = mongoClient.db("").collection("transactions");
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("migrate", () => {
    it("should not do anything if there is no document", async () => {
      await transactionMigrator.migrate();

      const allDocumentsInTransaction = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allDocumentsInTransaction).toHaveLength(0);
    });

    it("should not update any document if all of them are updated with new Schema", async () => {
      const inputTransactionProps: TransactionProps = {
        transactionID: "226ba95f96694df8ac555d9bab8700a4",
        userId: "m7V0GQHLhMIPeYOL9VQPV",
        sessionKey: "UheIQWniIDxrNK7PN77QQ",
        transactionStatus: "CRYPTO_OUTGOING_COMPLETED" as any,
        leg1Amount: 50,
        leg2Amount: 0.040129,
        leg1: "USD",
        leg2: "ETH",
        fixedSide: "fiat" as any,
        type: "onramp" as any,
        partnerID: "Kp4-zhWzc2yFnTZvc0H2O",
        tradeQuoteID: "d136e0f8-9afe-4c51-279c-7e90dca23883",
        nobaFee: 0,
        processingFee: 0,
        networkFee: 0,
        exchangeRate: 1245.73,
        buyRate: 1245.7342943425974,
        destinationWalletAddress: "0xAAf260989DA562907D6c7cE80b04a8FDB9B33fb0",
        transactionTimestamp: new Date("2022-11-11T16:33:51.145Z"),
        amountPreSpread: 50,
        lastProcessingTimestamp: 1668184083836,
        lastStatusUpdateTimestamp: 1668184078292,
        fiatPaymentInfo: {
          paymentMethodID: "processor-sandbox-34eba6bb-5b4f-42c1-ba77-2de5a1cc2586",
          isCompleted: false,
          isApproved: true,
          isFailed: false,
          details: [],
          paymentProvider: "Checkout" as any,
          paymentID: "pay_y32v4adyen2uxlgr6az2jsavmq",
        },
        transactionExceptions: [],
        discounts: {
          fixedCreditCardFeeDiscount: 0.3,
          dynamicCreditCardFeeDiscount: 1.45,
          networkFeeDiscount: 0.04,
          nobaFeeDiscount: 1.99,
          spreadDiscount: 1.3,
        },
        executedCrypto: 0.04013697,
        executedQuoteTradeID: "2e688635-6084-4fc6-93f6-9beaf2670341",
        executedQuoteSettledTimestamp: 1668183970084,
        nobaTransferTradeID: "239348",
        nobaTransferSettlementID: "a2e987d2-c7a4-4d57-a403-90ec0729f7aa",
        cryptoTransactionId: "1c32373b-da6e-4a96-97cd-a8dee7b12b2d",
        zhWithdrawalID: "330215",
        _id: "mock-transacion-id",
      };
      await transactionCollection.insertOne({
        ...inputTransactionProps,
        _id: inputTransactionProps._id as any,
      });

      await transactionMigrator.migrate();

      const outputConsumerProps = {
        transactionID: "226ba95f96694df8ac555d9bab8700a4",
        userId: "m7V0GQHLhMIPeYOL9VQPV",
        sessionKey: "UheIQWniIDxrNK7PN77QQ",
        transactionStatus: "CRYPTO_OUTGOING_COMPLETED" as any,
        leg1Amount: 50,
        leg2Amount: 0.040129,
        leg1: "USD",
        leg2: "ETH",
        fixedSide: "fiat" as any,
        type: "onramp" as any,
        partnerID: "Kp4-zhWzc2yFnTZvc0H2O",
        tradeQuoteID: "d136e0f8-9afe-4c51-279c-7e90dca23883",
        nobaFee: 0,
        processingFee: 0,
        networkFee: 0,
        exchangeRate: 1245.73,
        buyRate: 1245.7342943425974,
        destinationWalletAddress: "0xAAf260989DA562907D6c7cE80b04a8FDB9B33fb0",
        transactionTimestamp: new Date("2022-11-11T16:33:51.145Z"),
        amountPreSpread: 50,
        lastProcessingTimestamp: 1668184083836,
        lastStatusUpdateTimestamp: 1668184078292,
        fiatPaymentInfo: {
          paymentMethodID: "processor-sandbox-34eba6bb-5b4f-42c1-ba77-2de5a1cc2586",
          isCompleted: false,
          isApproved: true,
          isFailed: false,
          details: [],
          paymentProvider: "Checkout" as any,
          paymentID: "pay_y32v4adyen2uxlgr6az2jsavmq",
        },
        transactionExceptions: [],
        discounts: {
          fixedCreditCardFeeDiscount: 0.3,
          dynamicCreditCardFeeDiscount: 1.45,
          networkFeeDiscount: 0.04,
          nobaFeeDiscount: 1.99,
          spreadDiscount: 1.3,
        },
        executedCrypto: 0.04013697,
        executedQuoteTradeID: "2e688635-6084-4fc6-93f6-9beaf2670341",
        executedQuoteSettledTimestamp: 1668183970084,
        nobaTransferTradeID: "239348",
        nobaTransferSettlementID: "a2e987d2-c7a4-4d57-a403-90ec0729f7aa",
        cryptoTransactionId: "1c32373b-da6e-4a96-97cd-a8dee7b12b2d",
        zhWithdrawalID: "330215",
        _id: "mock-transacion-id",
        updatedTimestamp: expect.anything(),
      };

      const allDocumentsInTransaction = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allDocumentsInTransaction).toHaveLength(1);
      expect(allDocumentsInTransaction[0].props).toEqual(outputConsumerProps);
    });

    it("should update document if it has old Schema", async () => {
      const inputTransactionProps = {
        transactionID: "226ba95f96694df8ac555d9bab8700a4",
        userId: "m7V0GQHLhMIPeYOL9VQPV",
        sessionKey: "UheIQWniIDxrNK7PN77QQ",
        transactionStatus: "CRYPTO_OUTGOING_COMPLETED" as any,
        leg1Amount: 50,
        leg2Amount: 0.040129,
        leg1: "USD",
        leg2: "ETH",
        fixedSide: "fiat" as any,
        type: "onramp" as any,
        partnerID: "Kp4-zhWzc2yFnTZvc0H2O",
        tradeQuoteID: "d136e0f8-9afe-4c51-279c-7e90dca23883",
        nobaFee: 0,
        processingFee: 0,
        networkFee: 0,
        exchangeRate: 1245.73,
        buyRate: 1245.7342943425974,
        destinationWalletAddress: "0xAAf260989DA562907D6c7cE80b04a8FDB9B33fb0",
        transactionTimestamp: new Date("2022-11-11T16:33:51.145Z"),
        amountPreSpread: 50,
        lastProcessingTimestamp: 1668184083836,
        lastStatusUpdateTimestamp: 1668184078292,
        paymentMethodID: "processor-sandbox-34eba6bb-5b4f-42c1-ba77-2de5a1cc2586",
        checkoutPaymentID: "pay_y32v4adyen2uxlgr6az2jsavmq",
        transactionExceptions: [],
        discounts: {
          fixedCreditCardFeeDiscount: 0.3,
          dynamicCreditCardFeeDiscount: 1.45,
          networkFeeDiscount: 0.04,
          nobaFeeDiscount: 1.99,
          spreadDiscount: 1.3,
        },
        executedCrypto: 0.04013697,
        executedQuoteTradeID: "2e688635-6084-4fc6-93f6-9beaf2670341",
        executedQuoteSettledTimestamp: 1668183970084,
        nobaTransferTradeID: "239348",
        nobaTransferSettlementID: "a2e987d2-c7a4-4d57-a403-90ec0729f7aa",
        cryptoTransactionId: "1c32373b-da6e-4a96-97cd-a8dee7b12b2d",
        zhWithdrawalID: "330215",
        _id: "mock-transacion-id",
      };

      await transactionCollection.insertOne({
        ...inputTransactionProps,
        _id: inputTransactionProps._id as any,
      });

      await transactionMigrator.migrate();

      const migratedTransactionProps = {
        transactionID: "226ba95f96694df8ac555d9bab8700a4",
        userId: "m7V0GQHLhMIPeYOL9VQPV",
        sessionKey: "UheIQWniIDxrNK7PN77QQ",
        transactionStatus: "CRYPTO_OUTGOING_COMPLETED" as any,
        leg1Amount: 50,
        leg2Amount: 0.040129,
        leg1: "USD",
        leg2: "ETH",
        fixedSide: "fiat" as any,
        type: "onramp" as any,
        partnerID: "Kp4-zhWzc2yFnTZvc0H2O",
        tradeQuoteID: "d136e0f8-9afe-4c51-279c-7e90dca23883",
        nobaFee: 0,
        processingFee: 0,
        networkFee: 0,
        exchangeRate: 1245.73,
        buyRate: 1245.7342943425974,
        destinationWalletAddress: "0xAAf260989DA562907D6c7cE80b04a8FDB9B33fb0",
        transactionTimestamp: new Date("2022-11-11T16:33:51.145Z"),
        amountPreSpread: 50,
        lastProcessingTimestamp: 1668184083836,
        lastStatusUpdateTimestamp: 1668184078292,
        paymentMethodID: "processor-sandbox-34eba6bb-5b4f-42c1-ba77-2de5a1cc2586",
        checkoutPaymentID: "pay_y32v4adyen2uxlgr6az2jsavmq",
        fiatPaymentInfo: {
          paymentMethodID: "processor-sandbox-34eba6bb-5b4f-42c1-ba77-2de5a1cc2586",
          isCompleted: true,
          isApproved: true,
          isFailed: false,
          details: [],
          paymentProvider: "Checkout" as any,
          paymentID: "pay_y32v4adyen2uxlgr6az2jsavmq",
        },
        transactionExceptions: [],
        discounts: {
          fixedCreditCardFeeDiscount: 0.3,
          dynamicCreditCardFeeDiscount: 1.45,
          networkFeeDiscount: 0.04,
          nobaFeeDiscount: 1.99,
          spreadDiscount: 1.3,
        },
        executedCrypto: 0.04013697,
        executedQuoteTradeID: "2e688635-6084-4fc6-93f6-9beaf2670341",
        executedQuoteSettledTimestamp: 1668183970084,
        nobaTransferTradeID: "239348",
        nobaTransferSettlementID: "a2e987d2-c7a4-4d57-a403-90ec0729f7aa",
        cryptoTransactionId: "1c32373b-da6e-4a96-97cd-a8dee7b12b2d",
        zhWithdrawalID: "330215",
        _id: "mock-transacion-id",
        updatedTimestamp: expect.anything(),
      };
      const allDocumentsInTransaction = await getAllRecordsInTransactionCollection(transactionCollection);
      expect(allDocumentsInTransaction).toHaveLength(1);
      expect(allDocumentsInTransaction[0].props).toEqual(migratedTransactionProps);
    });

    it("should update document with old schema and don't modify the new schema documents", async () => {
      const partnerId = "mock-partner-id";

      const newSchemaInput = {
        transactionID: "2222222222222222",
        userId: "m7V0GQHLhMIPeYOL9VQPV",
        sessionKey: "UheIQWniIDxrNK7PN77QQ",
        transactionStatus: "CRYPTO_OUTGOING_COMPLETED" as any,
        leg1Amount: 50,
        leg2Amount: 0.040129,
        leg1: "USD",
        leg2: "ETH",
        fixedSide: "fiat" as any,
        type: "onramp" as any,
        partnerID: "Kp4-zhWzc2yFnTZvc0H2O",
        tradeQuoteID: "d136e0f8-9afe-4c51-279c-7e90dca23883",
        nobaFee: 0,
        processingFee: 0,
        networkFee: 0,
        exchangeRate: 1245.73,
        buyRate: 1245.7342943425974,
        destinationWalletAddress: "0xAAf260989DA562907D6c7cE80b04a8FDB9B33fb0",
        transactionTimestamp: new Date("2022-11-11T16:33:51.145Z"),
        amountPreSpread: 50,
        lastProcessingTimestamp: 1668184083836,
        lastStatusUpdateTimestamp: 1668184078292,
        fiatPaymentInfo: {
          paymentMethodID: "processor-sandbox-34eba6bb-5b4f-42c1-ba77-2de5a1cc2586",
          isCompleted: false,
          isApproved: true,
          isFailed: false,
          details: [],
          paymentProvider: "Checkout" as any,
          paymentID: "pay_y32v4adyen2uxlgr6az2jsavmq",
        },
        transactionExceptions: [],
        discounts: {
          fixedCreditCardFeeDiscount: 0.3,
          dynamicCreditCardFeeDiscount: 1.45,
          networkFeeDiscount: 0.04,
          nobaFeeDiscount: 1.99,
          spreadDiscount: 1.3,
        },
        executedCrypto: 0.04013697,
        executedQuoteTradeID: "2e688635-6084-4fc6-93f6-9beaf2670341",
        executedQuoteSettledTimestamp: 1668183970084,
        nobaTransferTradeID: "239348",
        nobaTransferSettlementID: "a2e987d2-c7a4-4d57-a403-90ec0729f7aa",
        cryptoTransactionId: "1c32373b-da6e-4a96-97cd-a8dee7b12b2d",
        zhWithdrawalID: "330215",
        _id: "2222222222222222",
      };
      const oldSchemaInput = {
        transactionID: "11111111111111111",
        userId: "m7V0GQHLhMIPeYOL9VQPV",
        sessionKey: "UheIQWniIDxrNK7PN77QQ",
        transactionStatus: "CRYPTO_OUTGOING_COMPLETED" as any,
        leg1Amount: 50,
        leg2Amount: 0.040129,
        leg1: "USD",
        leg2: "ETH",
        fixedSide: "fiat" as any,
        type: "onramp" as any,
        partnerID: "Kp4-zhWzc2yFnTZvc0H2O",
        tradeQuoteID: "d136e0f8-9afe-4c51-279c-7e90dca23883",
        nobaFee: 0,
        processingFee: 0,
        networkFee: 0,
        exchangeRate: 1245.73,
        buyRate: 1245.7342943425974,
        destinationWalletAddress: "0xAAf260989DA562907D6c7cE80b04a8FDB9B33fb0",
        transactionTimestamp: new Date("2022-11-11T16:33:51.145Z"),
        amountPreSpread: 50,
        lastProcessingTimestamp: 1668184083836,
        lastStatusUpdateTimestamp: 1668184078292,
        paymentMethodID: "processor-sandbox-34eba6bb-5b4f-42c1-ba77-2de5a1cc2586",
        checkoutPaymentID: "pay_y32v4adyen2uxlgr6az2jsavmq",
        transactionExceptions: [],
        discounts: {
          fixedCreditCardFeeDiscount: 0.3,
          dynamicCreditCardFeeDiscount: 1.45,
          networkFeeDiscount: 0.04,
          nobaFeeDiscount: 1.99,
          spreadDiscount: 1.3,
        },
        executedCrypto: 0.04013697,
        executedQuoteTradeID: "2e688635-6084-4fc6-93f6-9beaf2670341",
        executedQuoteSettledTimestamp: 1668183970084,
        nobaTransferTradeID: "239348",
        nobaTransferSettlementID: "a2e987d2-c7a4-4d57-a403-90ec0729f7aa",
        cryptoTransactionId: "1c32373b-da6e-4a96-97cd-a8dee7b12b2d",
        zhWithdrawalID: "330215",
        _id: "11111111111111111",
      };

      await transactionCollection.insertOne({
        ...oldSchemaInput,
        _id: oldSchemaInput._id as any,
      });
      await transactionCollection.insertOne({
        ...newSchemaInput,
        _id: newSchemaInput._id as any,
      });

      await transactionMigrator.migrate();

      const migratedOldSchema = {
        transactionID: "11111111111111111",
        userId: "m7V0GQHLhMIPeYOL9VQPV",
        sessionKey: "UheIQWniIDxrNK7PN77QQ",
        transactionStatus: "CRYPTO_OUTGOING_COMPLETED" as any,
        leg1Amount: 50,
        leg2Amount: 0.040129,
        leg1: "USD",
        leg2: "ETH",
        fixedSide: "fiat" as any,
        type: "onramp" as any,
        partnerID: "Kp4-zhWzc2yFnTZvc0H2O",
        tradeQuoteID: "d136e0f8-9afe-4c51-279c-7e90dca23883",
        nobaFee: 0,
        processingFee: 0,
        networkFee: 0,
        exchangeRate: 1245.73,
        buyRate: 1245.7342943425974,
        destinationWalletAddress: "0xAAf260989DA562907D6c7cE80b04a8FDB9B33fb0",
        transactionTimestamp: new Date("2022-11-11T16:33:51.145Z"),
        amountPreSpread: 50,
        lastProcessingTimestamp: 1668184083836,
        lastStatusUpdateTimestamp: 1668184078292,
        paymentMethodID: "processor-sandbox-34eba6bb-5b4f-42c1-ba77-2de5a1cc2586",
        checkoutPaymentID: "pay_y32v4adyen2uxlgr6az2jsavmq",
        fiatPaymentInfo: {
          paymentMethodID: "processor-sandbox-34eba6bb-5b4f-42c1-ba77-2de5a1cc2586",
          isCompleted: true,
          isApproved: true,
          isFailed: false,
          details: [],
          paymentProvider: "Checkout" as any,
          paymentID: "pay_y32v4adyen2uxlgr6az2jsavmq",
        },
        transactionExceptions: [],
        discounts: {
          fixedCreditCardFeeDiscount: 0.3,
          dynamicCreditCardFeeDiscount: 1.45,
          networkFeeDiscount: 0.04,
          nobaFeeDiscount: 1.99,
          spreadDiscount: 1.3,
        },
        executedCrypto: 0.04013697,
        executedQuoteTradeID: "2e688635-6084-4fc6-93f6-9beaf2670341",
        executedQuoteSettledTimestamp: 1668183970084,
        nobaTransferTradeID: "239348",
        nobaTransferSettlementID: "a2e987d2-c7a4-4d57-a403-90ec0729f7aa",
        cryptoTransactionId: "1c32373b-da6e-4a96-97cd-a8dee7b12b2d",
        zhWithdrawalID: "330215",
        _id: "11111111111111111",
        updatedTimestamp: expect.anything(),
      };
      const migratedNewSchema = {
        transactionID: "2222222222222222",
        userId: "m7V0GQHLhMIPeYOL9VQPV",
        sessionKey: "UheIQWniIDxrNK7PN77QQ",
        transactionStatus: "CRYPTO_OUTGOING_COMPLETED" as any,
        leg1Amount: 50,
        leg2Amount: 0.040129,
        leg1: "USD",
        leg2: "ETH",
        fixedSide: "fiat" as any,
        type: "onramp" as any,
        partnerID: "Kp4-zhWzc2yFnTZvc0H2O",
        tradeQuoteID: "d136e0f8-9afe-4c51-279c-7e90dca23883",
        nobaFee: 0,
        processingFee: 0,
        networkFee: 0,
        exchangeRate: 1245.73,
        buyRate: 1245.7342943425974,
        destinationWalletAddress: "0xAAf260989DA562907D6c7cE80b04a8FDB9B33fb0",
        transactionTimestamp: new Date("2022-11-11T16:33:51.145Z"),
        amountPreSpread: 50,
        lastProcessingTimestamp: 1668184083836,
        lastStatusUpdateTimestamp: 1668184078292,
        fiatPaymentInfo: {
          paymentMethodID: "processor-sandbox-34eba6bb-5b4f-42c1-ba77-2de5a1cc2586",
          isCompleted: false,
          isApproved: true,
          isFailed: false,
          details: [],
          paymentProvider: "Checkout" as any,
          paymentID: "pay_y32v4adyen2uxlgr6az2jsavmq",
        },
        transactionExceptions: [],
        discounts: {
          fixedCreditCardFeeDiscount: 0.3,
          dynamicCreditCardFeeDiscount: 1.45,
          networkFeeDiscount: 0.04,
          nobaFeeDiscount: 1.99,
          spreadDiscount: 1.3,
        },
        executedCrypto: 0.04013697,
        executedQuoteTradeID: "2e688635-6084-4fc6-93f6-9beaf2670341",
        executedQuoteSettledTimestamp: 1668183970084,
        nobaTransferTradeID: "239348",
        nobaTransferSettlementID: "a2e987d2-c7a4-4d57-a403-90ec0729f7aa",
        cryptoTransactionId: "1c32373b-da6e-4a96-97cd-a8dee7b12b2d",
        zhWithdrawalID: "330215",
        _id: "2222222222222222",
        updatedTimestamp: expect.anything(),
      };
      const allDocumentsInTransaction = (await getAllRecordsInTransactionCollection(transactionCollection)).map(
        transaction => transaction.props,
      );
      expect(allDocumentsInTransaction).toHaveLength(2);
      expect(allDocumentsInTransaction).toContainEqual(migratedNewSchema);
      expect(allDocumentsInTransaction).toContainEqual(migratedOldSchema);
    });
  });
});
