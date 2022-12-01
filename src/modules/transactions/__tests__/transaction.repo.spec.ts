import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient, Collection } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { FiatPaymentInfo, Transaction, TransactionProps } from "../domain/Transaction";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { MongoDBTransactionRepo } from "../repo/MongoDBTransactionRepo";
import { TransactionMapper } from "../mapper/TransactionMapper";
import {
  TransactionStatus,
  TransactionType,
  TransactionFilterOptions,
  TransactionsQuerySortField,
} from "../domain/Types";
import { CurrencyType } from "../../../../src/modules/common/domain/Types";
import { PaginatedResult, SortOrder } from "../../../core/infra/PaginationTypes";
import { PaymentProvider } from "../../../modules/consumer/domain/PaymentProvider";
import fs from "fs";

const TRANSACTION_ID_PREFIX = "transaction_id_prefix";
const TEST_NUMBER = 5;
const DEFAULT_USER_ID = "user_id";
const DEFAULT_PARTNER_ID = "partener_id";

const ETH = "ETH";
const BTC = "BTC";
const USD = "USD";
const EUR = "EUR";

const mkid = (id: string): string => {
  return TRANSACTION_ID_PREFIX + id;
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const getAllRecordsInTransactionCollection = async (
  transactionCollection: Collection,
): Promise<Array<TransactionProps>> => {
  const transactionDocumentsCursor = transactionCollection.find({});
  const allRecords: TransactionProps[] = [];

  while (await transactionDocumentsCursor.hasNext()) {
    const transactionDocument = await transactionDocumentsCursor.next();

    allRecords.push({
      ...transactionDocument,
      _id: transactionDocument._id.toString(),
    } as any);
  }

  return allRecords;
};

const getByTransactionIdInTransactionCollection = async (
  transactionCollection: Collection,
  transactionId: string,
): Promise<TransactionProps> => {
  const allTransactions = await getAllRecordsInTransactionCollection(transactionCollection);
  for (let i = 0; i < allTransactions.length; i++) {
    if (allTransactions[i]._id === transactionId) return allTransactions[i];
  }
  return null;
};

describe("MongoDBTransactionRepoTests", () => {
  jest.setTimeout(20000);

  let transactionRepo: ITransactionRepo;
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let transactionCollection: Collection;

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
      providers: [TransactionMapper, DBProvider, MongoDBTransactionRepo],
    }).compile();

    transactionRepo = app.get<MongoDBTransactionRepo>(MongoDBTransactionRepo);

    // Setup a mongodb client for interacting with "admins" collection.
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    transactionCollection = mongoClient.db("").collection("transactions");

    // adding two initial transactions for testing purposes.
    await transactionRepo.createTransaction(getRandomTransaction("1"));
    await transactionRepo.createTransaction(getRandomTransaction("2"));
  });

  afterEach(async () => {
    await mongoClient.close();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("getAll", () => {
    it("should get all records in the collection", async () => {
      // database is already filled with 2 transactions in beforeEach()
      await transactionRepo.createTransaction(getRandomTransaction("3"));
      await transactionRepo.createTransaction(getRandomTransaction("4"));

      const ts: Transaction[] = await transactionRepo.getAll();

      expect(ts).toHaveLength(4);
    });
  });

  describe("getTransaction", () => {
    it("should get a particular transaction in the database", async () => {
      const ts: Transaction = await transactionRepo.getTransaction(mkid("2"));

      expect(ts.props._id).toBe(mkid("2"));
    });
  });

  describe("createTransaction", () => {
    it("should create a new transaction in the database", async () => {
      const ts: Transaction = await transactionRepo.createTransaction(getRandomTransaction("newTransactionId"));
      const fromDB: Transaction = await transactionRepo.getTransaction(ts.props._id);

      expect(fromDB.props._id).toBe(mkid("newTransactionId"));
    });
  });

  describe("updateTransaction", () => {
    it("should update a transaction in the database", async () => {
      // this transaction already exists in beforeEachStep
      const ts: Transaction = await transactionRepo.getTransaction(mkid("1"));
      expect(ts.props.transactionStatus).toBe(TransactionStatus.PENDING); //all transaction are in pending state in beforeEach step
      ts.props.transactionStatus = TransactionStatus.COMPLETED;
      await transactionRepo.updateTransaction(ts);
      const fromDB: Transaction = await transactionRepo.getTransaction(ts.props._id);
      expect(fromDB.props.transactionStatus).toBe(TransactionStatus.COMPLETED);
    });
  });

  describe("updateTransactionStatus", () => {
    it("should update a transaction status in the database", async () => {
      // this transaction already exists in beforeEachStep
      const ts: Transaction = await transactionRepo.getTransaction(mkid("1"));
      expect(ts.props.transactionStatus).toBe(TransactionStatus.PENDING); //all transaction are in pending state in beforeEach step
      await transactionRepo.updateTransactionStatus(ts.props._id, TransactionStatus.COMPLETED, {});
      const fromDB: Transaction = await transactionRepo.getTransaction(ts.props._id);
      expect(fromDB.props.transactionStatus).toBe(TransactionStatus.COMPLETED);
    });
  });

  describe("updateLastProcessingTimestamp", () => {
    it("should update a transaction lastProcessingTimestamp in the database", async () => {
      // this transaction already exists in beforeEachStep
      const ts: Transaction = await transactionRepo.getTransaction(mkid("1"));
      await transactionRepo.updateLastProcessingTimestamp(ts.props._id);
      const fromDB: Transaction = await transactionRepo.getTransaction(ts.props._id);
      expect(fromDB.props.lastProcessingTimestamp).toBeLessThan(Date.now().valueOf());
      expect(fromDB.props.lastProcessingTimestamp).toBeGreaterThan(Date.now().valueOf() - 1000); // this check shouldn't take more than 1 second to reach here after updating the timestamp
    });
  });

  describe("getFilteredTransactions", () => {
    it("should get all transactions for a partner", async () => {
      await transactionRepo.createTransaction(
        getRandomTransaction("3", { userId: "differentUser", partnerID: DEFAULT_PARTNER_ID }),
      );
      await transactionRepo.createTransaction(getRandomTransaction("4", { partnerID: "partner1" }));

      await transactionRepo.createTransaction(
        getRandomTransaction("5", {
          userId: DEFAULT_USER_ID,
          partnerID: DEFAULT_PARTNER_ID,
          cryptoCurrency: ETH,
          fiatCurrency: USD,
          status: TransactionStatus.COMPLETED,
        }),
      );

      const filteredByPartnerIDResponse = await transactionRepo.getFilteredTransactions({
        partnerID: DEFAULT_PARTNER_ID,
      });

      expect(filteredByPartnerIDResponse.totalItems).toBe(4);

      const filteredByPartnerAndConsumerIDResponse = await transactionRepo.getFilteredTransactions({
        partnerID: DEFAULT_PARTNER_ID,
        consumerID: DEFAULT_USER_ID,
      });

      expect(filteredByPartnerAndConsumerIDResponse.totalItems).toBe(3);
      expect(filteredByPartnerAndConsumerIDResponse.items[0].props.userId).toBe(DEFAULT_USER_ID);
    });

    it("should get all transactions for a user", async () => {
      //  2 transaction already exists in beforeEachStep, will add 2 more transaction one with different user and one with same user but different partner
      await transactionRepo.createTransaction(
        getRandomTransaction("3", { userId: "differentUser", partnerID: DEFAULT_PARTNER_ID }),
      );
      await transactionRepo.createTransaction(getRandomTransaction("4", { partnerID: "partner1" }));

      const filterOpts: TransactionFilterOptions = {
        consumerID: DEFAULT_USER_ID,
        partnerID: DEFAULT_PARTNER_ID,
      };

      // 1. test basic filter on userId and partnerID works
      const ts: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions(filterOpts);
      expect(ts.items).toHaveLength(2);

      //2. test basic filter on userID alone works
      const allPartnersTs: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
      });
      expect(allPartnersTs.items).toHaveLength(3);

      // above total 4 transactions have been added, we will add more to cover below scenarios

      await transactionRepo.createTransaction(
        getRandomTransaction("5", {
          userId: DEFAULT_USER_ID,
          cryptoCurrency: ETH,
          fiatCurrency: USD,
          status: TransactionStatus.COMPLETED,
        }),
      );

      await transactionRepo.createTransaction(
        getRandomTransaction("6", { userId: DEFAULT_USER_ID, cryptoCurrency: ETH, fiatCurrency: USD }),
      );

      await transactionRepo.createTransaction(
        getRandomTransaction("7", { userId: DEFAULT_USER_ID, cryptoCurrency: BTC, fiatCurrency: EUR }),
      );

      await transactionRepo.createTransaction(
        getRandomTransaction("8", { userId: DEFAULT_USER_ID, cryptoCurrency: BTC, fiatCurrency: USD }),
      );

      await transactionRepo.createTransaction(
        getRandomTransaction("9", { userId: DEFAULT_USER_ID, cryptoCurrency: BTC, fiatCurrency: USD }),
      );

      const transaction10 = await transactionRepo.createTransaction(
        getRandomTransaction("10", { userId: DEFAULT_USER_ID, cryptoCurrency: ETH, fiatCurrency: EUR }),
      );

      //total 10 transactions have been added, we will test below scenarios, one of the above transacitions belongs to different user

      //3. test filter on cryptoCurrency alone works
      const testScenario3Results: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        cryptoCurrency: ETH,
      });

      expect(testScenario3Results.items).toHaveLength(3);

      //4. test filter on fiatCurrency alone works

      const testScenario4Results: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        fiatCurrency: EUR,
      });
      expect(testScenario4Results.items).toHaveLength(2);

      //5. test filter on cryptoCurrency and fiatCurrency works
      const testScenario5Results: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        cryptoCurrency: BTC,
        fiatCurrency: USD,
      });
      expect(testScenario5Results.items).toHaveLength(2);

      //6. test filter on transactionStatus alone works
      const testScenario6Results: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        transactionStatus: TransactionStatus.PENDING,
      });
      expect(testScenario6Results.items).toHaveLength(8); // only one in completed state, rest of 8 of 9 are in pending state, 1 belongs to different user

      const testScenario6Resultsb: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        transactionStatus: TransactionStatus.COMPLETED,
      });
      expect(testScenario6Resultsb.items).toHaveLength(1);

      //7. test sorting on the fiatCurrencyTicker fields works
      const testScenario7Results: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        sortField: TransactionsQuerySortField.leg1,
        sortOrder: SortOrder.ASC,
      });
      // four usd, two eur, three "LEG1" transactions
      expect(testScenario7Results.items.length).toBe(9);
      expect(testScenario7Results.items[0].props.leg1).toBe(EUR);
      expect(testScenario7Results.items[2].props.leg1).toBe("LEG1");
      expect(testScenario7Results.items[5].props.leg1).toBe(USD);

      const testScenario7Resultsb: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        sortField: TransactionsQuerySortField.leg1,
        sortOrder: SortOrder.DESC,
      });
      // four usd, two eur, three "LEG1" transactions
      expect(testScenario7Resultsb.items[0].props.leg1).toBe(USD);
      expect(testScenario7Resultsb.items[4].props.leg1).toBe("LEG1");
      expect(testScenario7Resultsb.items[7].props.leg1).toBe(EUR);

      //8. test sorting on the cryptoCurrency fields works
      const testScenario8Results: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        sortField: TransactionsQuerySortField.leg2,
        sortOrder: SortOrder.DESC,
      });
      // three ETH, 3 BTC, 3 "LEG2" transactions
      expect(testScenario8Results.items.length).toBe(9);
      expect(testScenario8Results.items[0].props.leg2).toBe("LEG2");
      expect(testScenario8Results.items[3].props.leg2).toBe(ETH);
      expect(testScenario8Results.items[6].props.leg2).toBe(BTC);

      //9. test sorting on creationTimestamp works
      const testScenario9Results: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        sortField: TransactionsQuerySortField.transactionTimestamp,
        sortOrder: SortOrder.ASC,
      });
      // test for ascending order
      expect(testScenario9Results.items.length).toBe(9);
      expect(testScenario9Results.items[0].props._id).toBe(mkid("1"));
      expect(testScenario9Results.items[1].props._id).toBe(mkid("2"));
      expect(testScenario9Results.items[2].props._id).toBe(mkid("4"));
      expect(testScenario9Results.items[3].props._id).toBe(mkid("5"));
      expect(testScenario9Results.items[4].props._id).toBe(mkid("6"));
      expect(testScenario9Results.items[5].props._id).toBe(mkid("7"));
      expect(testScenario9Results.items[6].props._id).toBe(mkid("8"));
      expect(testScenario9Results.items[7].props._id).toBe(mkid("9"));
      expect(testScenario9Results.items[8].props._id).toBe(mkid("10"));

      const testScenario9bResults: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        sortField: TransactionsQuerySortField.transactionTimestamp,
        sortOrder: SortOrder.DESC,
      });
      // test for descending order
      expect(testScenario9bResults.items.length).toBe(9);
      expect(testScenario9bResults.items[0].props._id).toBe(mkid("10"));
      expect(testScenario9bResults.items[1].props._id).toBe(mkid("9"));
      expect(testScenario9bResults.items[2].props._id).toBe(mkid("8"));
      expect(testScenario9bResults.items[3].props._id).toBe(mkid("7"));
      expect(testScenario9bResults.items[4].props._id).toBe(mkid("6"));
      expect(testScenario9bResults.items[5].props._id).toBe(mkid("5"));
      expect(testScenario9bResults.items[6].props._id).toBe(mkid("4"));
      expect(testScenario9bResults.items[7].props._id).toBe(mkid("2"));
      expect(testScenario9bResults.items[8].props._id).toBe(mkid("1"));

      //10. test start time filter works
      // updating timestamp of one of the transactions to not to be current date

      // this transaction shouldn't come in the filter after start date more than 2020-01-01
      await transactionRepo.updateTransaction(
        Transaction.createTransaction({ ...transaction10.props, transactionTimestamp: new Date("2020-01-01") }),
      );

      const tsAfter2ndJan2020: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        startDate: "2020-01-02",
      });

      expect(tsAfter2ndJan2020.items).toHaveLength(8); // one transaction shouldn't come

      const tsAfter1stJan2020: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        startDate: "2020-01-01",
      });

      expect(tsAfter1stJan2020.items).toHaveLength(9); // all transactions should come

      const tsAfterInfinity: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        startDate: "2200-01-01",
      });

      expect(tsAfterInfinity.items).toHaveLength(0); // no transaction should come

      //11. test end time filter works
      const tsBefore2ndJan2020: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        endDate: "2020-01-02",
      });

      expect(tsBefore2ndJan2020.items).toHaveLength(1); // all transactions should come

      const tsBefore1stJan2020: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        endDate: "2019-01-01",
      });

      expect(tsBefore1stJan2020.items).toHaveLength(0); // no transaction should come

      const tsBeforeInfinity: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        endDate: "2100-01-01",
      });

      expect(tsBeforeInfinity.items).toHaveLength(9); // all transactions should come

      //12. test both start and end time filter works
      const tsBetween1stJan2020And2ndJan2020: PaginatedResult<Transaction> =
        await transactionRepo.getFilteredTransactions({
          consumerID: DEFAULT_USER_ID,
          startDate: "2020-01-01",
          endDate: "2020-01-02",
        });

      expect(tsBetween1stJan2020And2ndJan2020.items).toHaveLength(1); // only one transaction should come

      //13. test pagination works with page limit
      const tsPage1: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        pageLimit: 3,
      });

      expect(tsPage1.items).toHaveLength(3);
      expect(tsPage1.hasNextPage).toBe(true);
      expect(tsPage1.totalItems).toBe(9);
      expect(tsPage1.totalPages).toBe(3);
      expect(tsPage1.page).toBe(1);

      //14. test offset works with filtering
      const tsPage2: PaginatedResult<Transaction> = await transactionRepo.getFilteredTransactions({
        consumerID: DEFAULT_USER_ID,
        pageLimit: 3,
        pageOffset: 1,
      });

      expect(tsPage2.page).toBe(2);
      expect(tsPage2.items[0].props._id).toBe(mkid("6")); // 9,8,7,6  as sorted by timestamp by default
      expect(tsPage2.items).toHaveLength(3);
      expect(tsPage2.hasNextPage).toBe(true);
      expect(tsPage2.totalItems).toBe(9);
    });
  });

  describe("getUserTransactionsInInterval", () => {
    it("should get all transactions for a user in a given interval", async () => {
      //  2 transaction already exists in beforeEachStep, will add 2 more transaction one with different user and one with same user but different partner
      await transactionRepo.createTransaction(
        getRandomTransaction("3", { userId: "differentUser", partnerID: DEFAULT_PARTNER_ID }),
      );
      await transactionRepo.createTransaction(getRandomTransaction("4", { partnerID: "partner1" }));
      const ts: Transaction[] = await transactionRepo.getUserTransactionInAnInterval(
        DEFAULT_USER_ID,
        DEFAULT_PARTNER_ID,
        new Date(Date.now() - 1000),
        new Date(Date.now() + 1000),
      );

      expect(ts).toHaveLength(2);
    });
  });

  describe("getValidTransactionsToProcess()", () => {
    it("should properly filter based on transaction status", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        lastProcessingTimestamp: 25,
        lastStatusUpdateTimestamp: 15,
      });
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111112" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        lastProcessingTimestamp: 25,
        lastStatusUpdateTimestamp: 15,
      });

      const pendingTransactions: Transaction[] = await transactionRepo.getValidTransactionsToProcess(
        /*maxLastUpdateTime=*/ 25,
        /*minStatusUpdateTime=*/ 15,
        TransactionStatus.PENDING,
      );
      const cryptoOutgoingCompletedTransactions: Transaction[] = await transactionRepo.getValidTransactionsToProcess(
        /*maxLastUpdateTime=*/ 25,
        /*minStatusUpdateTime=*/ 15,
        TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
      );

      expect(pendingTransactions).toHaveLength(0);
      expect(cryptoOutgoingCompletedTransactions).toHaveLength(1);
      expect(cryptoOutgoingCompletedTransactions[0].props._id).toBe("1111111111");
    });

    it("should not pick transaction which have been updated a while ago", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        lastProcessingTimestamp: 25,
        lastStatusUpdateTimestamp: 15,
      });
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111112" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        lastProcessingTimestamp: 30, // have been updated recently
        lastStatusUpdateTimestamp: 15,
      });

      const pendingTransactions: Transaction[] = await transactionRepo.getValidTransactionsToProcess(
        /*maxLastUpdateTime=*/ 27,
        /*minStatusUpdateTime=*/ 15,
        TransactionStatus.PENDING,
      );
      const cryptoOutgoingCompletedTransactions: Transaction[] = await transactionRepo.getValidTransactionsToProcess(
        /*maxLastUpdateTime=*/ 27,
        /*minStatusUpdateTime=*/ 15,
        TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
      );

      expect(pendingTransactions).toHaveLength(0);
      expect(cryptoOutgoingCompletedTransactions).toHaveLength(1);
      expect(cryptoOutgoingCompletedTransactions[0].props._id).toBe("1111111111");
    });

    it("should not pick transaction whose status has not been updated in recent past", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        lastProcessingTimestamp: 25,
        lastStatusUpdateTimestamp: 15,
      });
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111112" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        lastProcessingTimestamp: 25,
        lastStatusUpdateTimestamp: 20, // have been updated recently
      });

      const pendingTransactions: Transaction[] = await transactionRepo.getValidTransactionsToProcess(
        /*maxLastUpdateTime=*/ 25,
        /*minStatusUpdateTime=*/ 17,
        TransactionStatus.PENDING,
      );
      const cryptoOutgoingCompletedTransactions: Transaction[] = await transactionRepo.getValidTransactionsToProcess(
        /*maxLastUpdateTime=*/ 25,
        /*minStatusUpdateTime=*/ 17,
        TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
      );

      expect(pendingTransactions).toHaveLength(0);
      expect(cryptoOutgoingCompletedTransactions).toHaveLength(1);
      expect(cryptoOutgoingCompletedTransactions[0].props._id).toBe("1111111112");
    });
  });

  describe("getStaleTransactionsToProcess()", () => {
    it("should properly filter based on transaction status", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        lastProcessingTimestamp: 25,
        lastStatusUpdateTimestamp: 1,
      });
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111112" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
        lastProcessingTimestamp: 25,
        lastStatusUpdateTimestamp: 1,
      });

      const pendingTransactions: Transaction[] = await transactionRepo.getStaleTransactionsToProcess(
        /*maxLastUpdateTime=*/ 25,
        /*minStatusUpdateTime=*/ 15,
        TransactionStatus.PENDING,
      );
      const cryptoOutgoingCompletedTransactions: Transaction[] = await transactionRepo.getStaleTransactionsToProcess(
        /*maxLastUpdateTime=*/ 25,
        /*minStatusUpdateTime=*/ 15,
        TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
      );

      expect(pendingTransactions).toHaveLength(0);
      expect(cryptoOutgoingCompletedTransactions).toHaveLength(1);
      expect(cryptoOutgoingCompletedTransactions[0].props._id).toBe("1111111111");
    });

    it("should not pick transaction which have been updated a while ago", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        lastProcessingTimestamp: 25,
        lastStatusUpdateTimestamp: 1,
      });
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111112" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        lastProcessingTimestamp: 30, // have been updated recently
        lastStatusUpdateTimestamp: 1,
      });

      const pendingTransactions: Transaction[] = await transactionRepo.getStaleTransactionsToProcess(
        /*maxLastUpdateTime=*/ 27,
        /*minStatusUpdateTime=*/ 15,
        TransactionStatus.PENDING,
      );
      const cryptoOutgoingCompletedTransactions: Transaction[] = await transactionRepo.getStaleTransactionsToProcess(
        /*maxLastUpdateTime=*/ 27,
        /*minStatusUpdateTime=*/ 15,
        TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
      );

      expect(pendingTransactions).toHaveLength(0);
      expect(cryptoOutgoingCompletedTransactions).toHaveLength(1);
      expect(cryptoOutgoingCompletedTransactions[0].props._id).toBe("1111111111");
    });

    it("should pick transaction whose status has not been updated in recent past", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        lastProcessingTimestamp: 25,
        lastStatusUpdateTimestamp: 1,
      });
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111112" as any,
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        lastProcessingTimestamp: 25,
        lastStatusUpdateTimestamp: 17, // have been updated recently
      });

      const pendingTransactions: Transaction[] = await transactionRepo.getValidTransactionsToProcess(
        /*maxLastUpdateTime=*/ 25,
        /*minStatusUpdateTime=*/ 17,
        TransactionStatus.PENDING,
      );
      const cryptoOutgoingCompletedTransactions: Transaction[] = await transactionRepo.getValidTransactionsToProcess(
        /*maxLastUpdateTime=*/ 25,
        /*minStatusUpdateTime=*/ 17,
        TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
      );

      expect(pendingTransactions).toHaveLength(0);
      expect(cryptoOutgoingCompletedTransactions).toHaveLength(1);
      expect(cryptoOutgoingCompletedTransactions[0].props._id).toBe("1111111112");
    });
  });

  describe("getTotalUserTransactionAmount", () => {
    it("should get the total amount of a user's transactions", async () => {
      const totalAmount: number = await transactionRepo.getTotalUserTransactionAmount(DEFAULT_USER_ID);
      expect(totalAmount).toBe(TEST_NUMBER * 2);
    });
  });

  describe("getMonthlyUserTransactionAmount", () => {
    it("should get the total amount of a user's transactions in a month", async () => {
      const totalAmount: number = await transactionRepo.getMonthlyUserTransactionAmount(DEFAULT_USER_ID);
      expect(totalAmount).toBe(TEST_NUMBER * 2);
    });
  });

  describe("getWeeklyUserTransactionAmount", () => {
    it("should get the total amount of a user's transactions in a week", async () => {
      const totalAmount: number = await transactionRepo.getWeeklyUserTransactionAmount(DEFAULT_USER_ID);
      expect(totalAmount).toBe(TEST_NUMBER * 2);
    });
  });

  describe("getDailyUserTransactionAmount", () => {
    it("should get the total amount of a user's transactions in a day", async () => {
      const totalAmount: number = await transactionRepo.getDailyUserTransactionAmount(DEFAULT_USER_ID);
      expect(totalAmount).toBe(TEST_NUMBER * 2);
    });
  });

  describe("updateFiatTransactionInfo()", () => {
    it("should update 'isApproved' field", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        fiatPaymentInfo: {
          paymentMethodID: "fake-paymethod-method",
          isCompleted: false,
          isApproved: true,
          isFailed: false,
          details: [],
          paymentID: "payment-1",
          paymentProvider: PaymentProvider.CHECKOUT,
        },
      });

      await transactionRepo.updateFiatTransactionInfo({
        transactionID: "1111111111",
        willUpdateIsApproved: true,
        updatedIsApprovedValue: false,
        willUpdateIsCompleted: false,
        willUpdateIsFailed: false,
        details: "more granular details",
      });

      const updatedTransactionStateInDB = await getByTransactionIdInTransactionCollection(
        transactionCollection,
        "1111111111",
      );
      expect(updatedTransactionStateInDB.fiatPaymentInfo).toStrictEqual({
        paymentMethodID: "fake-paymethod-method",
        isCompleted: false,
        isApproved: false,
        isFailed: false,
        details: ["more granular details"],
        paymentID: "payment-1",
        paymentProvider: PaymentProvider.CHECKOUT,
      });
    });

    it("should update 'isFailed' field", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        fiatPaymentInfo: {
          paymentMethodID: "fake-paymethod-method",
          isCompleted: false,
          isApproved: false,
          isFailed: true,
          details: [],
          paymentID: "payment-1",
          paymentProvider: PaymentProvider.CHECKOUT,
        },
      });

      await transactionRepo.updateFiatTransactionInfo({
        transactionID: "1111111111",
        willUpdateIsApproved: false,
        willUpdateIsCompleted: false,
        willUpdateIsFailed: true,
        updatedIsFailedValue: false,
        details: "more granular details",
      });

      const updatedTransactionStateInDB = await getByTransactionIdInTransactionCollection(
        transactionCollection,
        "1111111111",
      );
      expect(updatedTransactionStateInDB.fiatPaymentInfo).toStrictEqual({
        paymentMethodID: "fake-paymethod-method",
        isCompleted: false,
        isApproved: false,
        isFailed: false,
        details: ["more granular details"],
        paymentID: "payment-1",
        paymentProvider: PaymentProvider.CHECKOUT,
      });
    });

    it("should update 'isCompleted' field", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        fiatPaymentInfo: {
          paymentMethodID: "fake-paymethod-method",
          isCompleted: true,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: "payment-1",
          paymentProvider: PaymentProvider.CHECKOUT,
        },
      });

      await transactionRepo.updateFiatTransactionInfo({
        transactionID: "1111111111",
        willUpdateIsApproved: false,
        willUpdateIsCompleted: true,
        updatedIsCompletedValue: false,
        willUpdateIsFailed: false,
        details: "more granular details",
      });

      const updatedTransactionStateInDB = await getByTransactionIdInTransactionCollection(
        transactionCollection,
        "1111111111",
      );
      expect(updatedTransactionStateInDB.fiatPaymentInfo).toStrictEqual({
        paymentMethodID: "fake-paymethod-method",
        isCompleted: false,
        isApproved: false,
        isFailed: false,
        details: ["more granular details"],
        paymentID: "payment-1",
        paymentProvider: PaymentProvider.CHECKOUT,
      });
    });

    it("should update only the 2 desired fields as mentioned in request", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        fiatPaymentInfo: {
          paymentMethodID: "fake-paymethod-method",
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: "payment-1",
          paymentProvider: PaymentProvider.CHECKOUT,
        },
      });
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111112" as any,
        fiatPaymentInfo: {
          paymentMethodID: "fake-paymethod-method",
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: "payment-2",
          paymentProvider: PaymentProvider.CHECKOUT,
        },
      });

      await transactionRepo.updateFiatTransactionInfo({
        transactionID: "1111111111",
        willUpdateIsApproved: true,
        updatedIsApprovedValue: true,
        willUpdateIsCompleted: true,
        updatedIsCompletedValue: true,
        willUpdateIsFailed: false,
        details: "more granular details",
      });

      const updatedTransactionStateInDB = await getByTransactionIdInTransactionCollection(
        transactionCollection,
        "1111111111",
      );
      expect(updatedTransactionStateInDB.fiatPaymentInfo).toStrictEqual({
        paymentMethodID: "fake-paymethod-method",
        isCompleted: true,
        isApproved: true,
        isFailed: false,
        details: ["more granular details"],
        paymentID: "payment-1",
        paymentProvider: PaymentProvider.CHECKOUT,
      });
    });

    it("should push details correctly even if there are no fields to be updated in request", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        fiatPaymentInfo: {
          paymentMethodID: "fake-paymethod-method",
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: "payment-1",
          paymentProvider: PaymentProvider.CHECKOUT,
        },
      });
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111112" as any,
        fiatPaymentInfo: {
          paymentMethodID: "fake-paymethod-method",
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: "payment-2",
          paymentProvider: PaymentProvider.CHECKOUT,
        },
      });

      await transactionRepo.updateFiatTransactionInfo({
        transactionID: "1111111111",
        willUpdateIsApproved: true,
        updatedIsApprovedValue: true,
        willUpdateIsCompleted: false,
        willUpdateIsFailed: false,
        details: "more granular details",
      });
      await transactionRepo.updateFiatTransactionInfo({
        transactionID: "1111111111",
        willUpdateIsApproved: false,
        willUpdateIsCompleted: false,
        willUpdateIsFailed: false,
        details: "doesn't update any fields",
      });

      const updatedTransactionStateInDB = await getByTransactionIdInTransactionCollection(
        transactionCollection,
        "1111111111",
      );
      expect(updatedTransactionStateInDB.fiatPaymentInfo).toStrictEqual({
        paymentMethodID: "fake-paymethod-method",
        isCompleted: false,
        isApproved: true,
        isFailed: false,
        details: ["more granular details", "doesn't update any fields"],
        paymentID: "payment-1",
        paymentProvider: PaymentProvider.CHECKOUT,
      });
    });

    it("shouldn't update the field if the value is already same", async () => {
      // TODO(#): Remove this once tests are localised and is creating their own transactions.
      await transactionCollection.deleteMany({});

      const defaultTransaction: TransactionProps = getRandomTransaction(mkid("1")).props;
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111111" as any,
        fiatPaymentInfo: {
          paymentMethodID: "fake-paymethod-method",
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: "payment-1",
          paymentProvider: PaymentProvider.CHECKOUT,
        },
      });
      await transactionCollection.insertOne({
        ...defaultTransaction,
        _id: "1111111112" as any,
        fiatPaymentInfo: {
          paymentMethodID: "fake-paymethod-method",
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentID: "payment-2",
          paymentProvider: PaymentProvider.CHECKOUT,
        },
      });

      await transactionRepo.updateFiatTransactionInfo({
        transactionID: "1111111111",
        willUpdateIsApproved: true,
        updatedIsApprovedValue: false,
        willUpdateIsCompleted: true,
        updatedIsCompletedValue: true,
        willUpdateIsFailed: true,
        updatedIsFailedValue: true,
        details: "All are required to be changed but 'isApproved' is still 'false'",
      });

      const updatedTransactionStateInDB = await getByTransactionIdInTransactionCollection(
        transactionCollection,
        "1111111111",
      );
      expect(updatedTransactionStateInDB.fiatPaymentInfo).toStrictEqual({
        paymentMethodID: "fake-paymethod-method",
        isCompleted: true,
        isApproved: false,
        isFailed: true,
        details: ["All are required to be changed but 'isApproved' is still 'false'"],
        paymentID: "payment-1",
        paymentProvider: PaymentProvider.CHECKOUT,
      });
    });
  });

  describe("getPartnerTransactions()", () => {
    it("should store the records in CSV format in the specified file", async () => {
      await transactionCollection.deleteMany({});

      const date1 = new Date();
      const date2 = new Date();

      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_1",
        transactionID: "TTTTTTTTT_1",
        userId: "UUUUUUUUUU_1",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date1,
        leg1Amount: 100,
        leg1: "USD",
        leg2Amount: 0.03,
        leg2: "ETH",
        fixedSide: CurrencyType.FIAT,
        processingFee: 14,
        networkFee: 15,
        nobaFee: 16,
        discounts: {
          fixedCreditCardFeeDiscount: 1.4,
          dynamicCreditCardFeeDiscount: 1.5,
          nobaFeeDiscount: 1.6,
          networkFeeDiscount: 1.7,
          spreadDiscount: 1.8,
        },
        _id: "1111111111" as any,
      });
      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_1",
        transactionID: "TTTTTTTTT_2",
        userId: "UUUUUUUUUU_2",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date2,
        leg2Amount: 200,
        leg2: "USD",
        leg1Amount: 0.23,
        leg1: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        processingFee: 24,
        networkFee: 25,
        nobaFee: 26,
        discounts: {
          fixedCreditCardFeeDiscount: 2.4,
          dynamicCreditCardFeeDiscount: 2.5,
          nobaFeeDiscount: 2.6,
          networkFeeDiscount: 2.7,
          spreadDiscount: 2.8,
        },
        _id: "22222222222" as any,
      });

      const filePath = `/tmp/txn-${Math.floor(Math.random() * 1000000)}.csv`;

      await transactionRepo.getPartnerTransactions(
        {
          startDate: date1,
          endDate: date2,
          includeIncompleteTransactions: false,
        },
        filePath,
      );

      const csvContent = await fs.readFileSync(filePath, { encoding: "utf8" });
      const receivedRecords = csvContent.split("\n");
      const expectedRecords = [
        `PPPPPPPPP_1,TTTTTTTTT_1,UUUUUUUUUU_1,"${date1.toUTCString()}",COMPLETED,100,USD,0.03,ETH,14,15,16,1.4,1.5,1.6,1.7,1.8`,
        `PPPPPPPPP_1,TTTTTTTTT_2,UUUUUUUUUU_2,"${date2.toUTCString()}",COMPLETED,200,USD,0.23,ETH,24,25,26,2.4,2.5,2.6,2.7,2.8`,
      ];

      expect(receivedRecords).toHaveLength(1 + 2 + 1); // HEADER + 2 RECORDS + EMPTY LINE
      expectedRecords.forEach(record => {
        expect(receivedRecords).toContain(record);
      });
    });

    it("should skip the records which are after 'startDate' in CSV file", async () => {
      await transactionCollection.deleteMany({});

      const date1 = new Date();
      await sleep(500);
      const date2 = new Date();

      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_1",
        transactionID: "TTTTTTTTT_1",
        userId: "UUUUUUUUUU_1",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date1,
        leg1Amount: 100,
        leg1: "USD",
        leg2Amount: 0.03,
        leg2: "ETH",
        fixedSide: CurrencyType.FIAT,
        processingFee: 14,
        networkFee: 15,
        nobaFee: 16,
        discounts: {
          fixedCreditCardFeeDiscount: 1.4,
          dynamicCreditCardFeeDiscount: 1.5,
          nobaFeeDiscount: 1.6,
          networkFeeDiscount: 1.7,
          spreadDiscount: 1.8,
        },
        _id: "1111111111" as any,
      });
      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_1",
        transactionID: "TTTTTTTTT_2",
        userId: "UUUUUUUUUU_2",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date2,
        leg2Amount: 200,
        leg2: "USD",
        leg1Amount: 0.23,
        leg1: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        processingFee: 24,
        networkFee: 25,
        nobaFee: 26,
        discounts: {
          fixedCreditCardFeeDiscount: 2.4,
          dynamicCreditCardFeeDiscount: 2.5,
          nobaFeeDiscount: 2.6,
          networkFeeDiscount: 2.7,
          spreadDiscount: 2.8,
        },
        _id: "22222222222" as any,
      });

      const filePath = `/tmp/txn-${Math.floor(Math.random() * 1000000)}.csv`;

      await transactionRepo.getPartnerTransactions(
        {
          startDate: date2,
          includeIncompleteTransactions: false,
        },
        filePath,
      );

      const csvContent = await fs.readFileSync(filePath, { encoding: "utf8" });
      const receivedRecords = csvContent.split("\n");
      const expectedRecords = [
        `PPPPPPPPP_1,TTTTTTTTT_2,UUUUUUUUUU_2,"${date2.toUTCString()}",COMPLETED,200,USD,0.23,ETH,24,25,26,2.4,2.5,2.6,2.7,2.8`,
      ];

      expect(receivedRecords).toHaveLength(1 + 1 + 1); // HEADER + 1 RECORD + EMPTY LINE
      expectedRecords.forEach(record => {
        expect(receivedRecords).toContain(record);
      });
    });

    it("should skip the records which are before 'endDate' in CSV file", async () => {
      await transactionCollection.deleteMany({});

      const date1 = new Date();
      await sleep(500);
      const date2 = new Date();

      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_1",
        transactionID: "TTTTTTTTT_1",
        userId: "UUUUUUUUUU_1",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date1,
        leg1Amount: 100,
        leg1: "USD",
        leg2Amount: 0.03,
        leg2: "ETH",
        fixedSide: CurrencyType.FIAT,
        processingFee: 14,
        networkFee: 15,
        nobaFee: 16,
        discounts: {
          fixedCreditCardFeeDiscount: 1.4,
          dynamicCreditCardFeeDiscount: 1.5,
          nobaFeeDiscount: 1.6,
          networkFeeDiscount: 1.7,
          spreadDiscount: 1.8,
        },
        _id: "1111111111" as any,
      });
      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_1",
        transactionID: "TTTTTTTTT_2",
        userId: "UUUUUUUUUU_2",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date2,
        leg2Amount: 200,
        leg2: "USD",
        leg1Amount: 0.23,
        leg1: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        processingFee: 24,
        networkFee: 25,
        nobaFee: 26,
        discounts: {
          fixedCreditCardFeeDiscount: 2.4,
          dynamicCreditCardFeeDiscount: 2.5,
          nobaFeeDiscount: 2.6,
          networkFeeDiscount: 2.7,
          spreadDiscount: 2.8,
        },
        _id: "22222222222" as any,
      });

      const filePath = `/tmp/txn-${Math.floor(Math.random() * 1000000)}.csv`;

      await transactionRepo.getPartnerTransactions(
        {
          endDate: date1,
          includeIncompleteTransactions: false,
        },
        filePath,
      );

      const csvContent = await fs.readFileSync(filePath, { encoding: "utf8" });
      const receivedRecords = csvContent.split("\n");
      const expectedRecords = [
        `PPPPPPPPP_1,TTTTTTTTT_1,UUUUUUUUUU_1,"${date1.toUTCString()}",COMPLETED,100,USD,0.03,ETH,14,15,16,1.4,1.5,1.6,1.7,1.8`,
      ];

      expect(receivedRecords).toHaveLength(1 + 1 + 1); // HEADER + 1 RECORD + EMPTY LINE
      expectedRecords.forEach(record => {
        expect(receivedRecords).toContain(record);
      });
    });

    it("should filter the transaction based on specified 'partnerID' in CSV file", async () => {
      await transactionCollection.deleteMany({});

      const date1 = new Date();
      const date2 = new Date();

      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_1",
        transactionID: "TTTTTTTTT_1",
        userId: "UUUUUUUUUU_1",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date1,
        leg1Amount: 100,
        leg1: "USD",
        leg2Amount: 0.03,
        leg2: "ETH",
        fixedSide: CurrencyType.FIAT,
        processingFee: 14,
        networkFee: 15,
        nobaFee: 16,
        discounts: {
          fixedCreditCardFeeDiscount: 1.4,
          dynamicCreditCardFeeDiscount: 1.5,
          nobaFeeDiscount: 1.6,
          networkFeeDiscount: 1.7,
          spreadDiscount: 1.8,
        },
        _id: "1111111111" as any,
      });
      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_2",
        transactionID: "TTTTTTTTT_2",
        userId: "UUUUUUUUUU_2",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date2,
        leg2Amount: 200,
        leg2: "USD",
        leg1Amount: 0.23,
        leg1: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        processingFee: 24,
        networkFee: 25,
        nobaFee: 26,
        discounts: {
          fixedCreditCardFeeDiscount: 2.4,
          dynamicCreditCardFeeDiscount: 2.5,
          nobaFeeDiscount: 2.6,
          networkFeeDiscount: 2.7,
          spreadDiscount: 2.8,
        },
        _id: "22222222222" as any,
      });

      const filePath = `/tmp/txn-${Math.floor(Math.random() * 1000000)}.csv`;

      await transactionRepo.getPartnerTransactions(
        {
          partnerID: "PPPPPPPPP_1",
          includeIncompleteTransactions: false,
        },
        filePath,
      );

      const csvContent = await fs.readFileSync(filePath, { encoding: "utf8" });
      const receivedRecords = csvContent.split("\n");
      const expectedRecords = [
        `PPPPPPPPP_1,TTTTTTTTT_1,UUUUUUUUUU_1,"${date1.toUTCString()}",COMPLETED,100,USD,0.03,ETH,14,15,16,1.4,1.5,1.6,1.7,1.8`,
      ];

      expect(receivedRecords).toHaveLength(1 + 1 + 1); // HEADER + 1 RECORD + EMPTY LINE
      expectedRecords.forEach(record => {
        expect(receivedRecords).toContain(record);
      });
    });

    it("should only include 'COMPLETED' transactions if 'includeIncompleteTransactions' is false", async () => {
      await transactionCollection.deleteMany({});

      const date1 = new Date();
      const date2 = new Date();

      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_1",
        transactionID: "TTTTTTTTT_1",
        userId: "UUUUUUUUUU_1",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date1,
        leg1Amount: 100,
        leg1: "USD",
        leg2Amount: 0.03,
        leg2: "ETH",
        fixedSide: CurrencyType.FIAT,
        processingFee: 14,
        networkFee: 15,
        nobaFee: 16,
        discounts: {
          fixedCreditCardFeeDiscount: 1.4,
          dynamicCreditCardFeeDiscount: 1.5,
          nobaFeeDiscount: 1.6,
          networkFeeDiscount: 1.7,
          spreadDiscount: 1.8,
        },
        _id: "1111111111" as any,
      });
      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_2",
        transactionID: "TTTTTTTTT_2",
        userId: "UUUUUUUUUU_2",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        transactionTimestamp: date2,
        leg2Amount: 200,
        leg2: "USD",
        leg1Amount: 0.23,
        leg1: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        processingFee: 24,
        networkFee: 25,
        nobaFee: 26,
        discounts: {
          fixedCreditCardFeeDiscount: 2.4,
          dynamicCreditCardFeeDiscount: 2.5,
          nobaFeeDiscount: 2.6,
          networkFeeDiscount: 2.7,
          spreadDiscount: 2.8,
        },
        _id: "22222222222" as any,
      });

      const filePath = `/tmp/txn-${Math.floor(Math.random() * 1000000)}.csv`;

      await transactionRepo.getPartnerTransactions(
        {
          includeIncompleteTransactions: false,
        },
        filePath,
      );

      const csvContent = await fs.readFileSync(filePath, { encoding: "utf8" });
      const receivedRecords = csvContent.split("\n");
      const expectedRecords = [
        `PPPPPPPPP_1,TTTTTTTTT_1,UUUUUUUUUU_1,"${date1.toUTCString()}",COMPLETED,100,USD,0.03,ETH,14,15,16,1.4,1.5,1.6,1.7,1.8`,
      ];

      expect(receivedRecords).toHaveLength(1 + 1 + 1); // HEADER + 1 RECORD + EMPTY LINE
      expectedRecords.forEach(record => {
        expect(receivedRecords).toContain(record);
      });
    });

    it("should include non-'COMPLETED' transactions if 'includeIncompleteTransactions' is true", async () => {
      await transactionCollection.deleteMany({});

      const date1 = new Date();
      const date2 = new Date();

      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_1",
        transactionID: "TTTTTTTTT_1",
        userId: "UUUUUUUUUU_1",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date1,
        leg1Amount: 100,
        leg1: "USD",
        leg2Amount: 0.03,
        leg2: "ETH",
        fixedSide: CurrencyType.FIAT,
        processingFee: 14,
        networkFee: 15,
        nobaFee: 16,
        discounts: {
          fixedCreditCardFeeDiscount: 1.4,
          dynamicCreditCardFeeDiscount: 1.5,
          nobaFeeDiscount: 1.6,
          networkFeeDiscount: 1.7,
          spreadDiscount: 1.8,
        },
        _id: "1111111111" as any,
      });
      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_2",
        transactionID: "TTTTTTTTT_2",
        userId: "UUUUUUUUUU_2",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        transactionTimestamp: date2,
        leg2Amount: 200,
        leg2: "USD",
        leg1Amount: 0.23,
        leg1: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        processingFee: 24,
        networkFee: 25,
        nobaFee: 26,
        discounts: {
          fixedCreditCardFeeDiscount: 2.4,
          dynamicCreditCardFeeDiscount: 2.5,
          nobaFeeDiscount: 2.6,
          networkFeeDiscount: 2.7,
          spreadDiscount: 2.8,
        },
        _id: "22222222222" as any,
      });

      const filePath = `/tmp/txn-${Math.floor(Math.random() * 1000000)}.csv`;

      await transactionRepo.getPartnerTransactions(
        {
          includeIncompleteTransactions: true,
        },
        filePath,
      );

      const csvContent = await fs.readFileSync(filePath, { encoding: "utf8" });
      const receivedRecords = csvContent.split("\n");
      const expectedRecords = [
        `PPPPPPPPP_1,TTTTTTTTT_1,UUUUUUUUUU_1,"${date1.toUTCString()}",COMPLETED,100,USD,0.03,ETH,14,15,16,1.4,1.5,1.6,1.7,1.8`,
        `PPPPPPPPP_2,TTTTTTTTT_2,UUUUUUUUUU_2,"${date2.toUTCString()}",CRYPTO_OUTGOING_COMPLETED,200,USD,0.23,ETH,24,25,26,2.4,2.5,2.6,2.7,2.8`,
      ];

      expect(receivedRecords).toHaveLength(1 + 2 + 1); // HEADER + 2 RECORD + EMPTY LINE
      expectedRecords.forEach(record => {
        expect(receivedRecords).toContain(record);
      });
    });

    it("should filter the transaction based on specified 'partnerID', 'startDate', 'endDate' & 'includeIncompleteTransactions' in CSV file", async () => {
      await transactionCollection.deleteMany({});

      const date1 = new Date();
      await sleep(500);
      const date2 = new Date();
      await sleep(500);
      const date3 = new Date();
      await sleep(500);
      const date4 = new Date();

      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_1",
        transactionID: "TTTTTTTTT_1",
        userId: "UUUUUUUUUU_1",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date1,
        leg1Amount: 100,
        leg1: "USD",
        leg2Amount: 0.03,
        leg2: "ETH",
        fixedSide: CurrencyType.FIAT,
        processingFee: 14,
        networkFee: 15,
        nobaFee: 16,
        discounts: {
          fixedCreditCardFeeDiscount: 1.4,
          dynamicCreditCardFeeDiscount: 1.5,
          nobaFeeDiscount: 1.6,
          networkFeeDiscount: 1.7,
          spreadDiscount: 1.8,
        },
        _id: "1111111111" as any,
      });
      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_2",
        transactionID: "TTTTTTTTT_2",
        userId: "UUUUUUUUUU_2",
        transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
        transactionTimestamp: date2,
        leg2Amount: 200,
        leg2: "USD",
        leg1Amount: 0.23,
        leg1: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        processingFee: 24,
        networkFee: 25,
        nobaFee: 26,
        discounts: {
          fixedCreditCardFeeDiscount: 2.4,
          dynamicCreditCardFeeDiscount: 2.5,
          nobaFeeDiscount: 2.6,
          networkFeeDiscount: 2.7,
          spreadDiscount: 2.8,
        },
        _id: "22222222222" as any,
      });
      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_2",
        transactionID: "TTTTTTTTT_3",
        userId: "UUUUUUUUUU_3",
        transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
        transactionTimestamp: date3,
        leg2Amount: 300,
        leg2: "USD",
        leg1Amount: 0.33,
        leg1: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        processingFee: 34,
        networkFee: 35,
        nobaFee: 36,
        discounts: {
          fixedCreditCardFeeDiscount: 3.4,
          dynamicCreditCardFeeDiscount: 3.5,
          nobaFeeDiscount: 3.6,
          networkFeeDiscount: 3.7,
          spreadDiscount: 3.8,
        },
        _id: "333333333333" as any,
      });
      await transactionCollection.insertOne({
        partnerID: "PPPPPPPPP_2",
        transactionID: "TTTTTTTTT_4",
        userId: "UUUUUUUUUU_4",
        transactionStatus: TransactionStatus.COMPLETED,
        transactionTimestamp: date4,
        leg2Amount: 400,
        leg2: "USD",
        leg1Amount: 0.43,
        leg1: "ETH",
        fixedSide: CurrencyType.CRYPTO,
        processingFee: 44,
        networkFee: 45,
        nobaFee: 46,
        discounts: {
          fixedCreditCardFeeDiscount: 4.4,
          dynamicCreditCardFeeDiscount: 4.5,
          nobaFeeDiscount: 4.6,
          networkFeeDiscount: 4.7,
          spreadDiscount: 4.8,
        },
        _id: "44444444444" as any,
      });

      const filePath = `/tmp/txn-${Math.floor(Math.random() * 1000000)}.csv`;

      await transactionRepo.getPartnerTransactions(
        {
          partnerID: "PPPPPPPPP_2",
          startDate: date2,
          endDate: date3,
          includeIncompleteTransactions: true,
        },
        filePath,
      );

      const csvContent = await fs.readFileSync(filePath, { encoding: "utf8" });
      const receivedRecords = csvContent.split("\n");
      const expectedRecords = [
        `PPPPPPPPP_2,TTTTTTTTT_2,UUUUUUUUUU_2,"${date2.toUTCString()}",FIAT_INCOMING_COMPLETED,200,USD,0.23,ETH,24,25,26,2.4,2.5,2.6,2.7,2.8`,
        `PPPPPPPPP_2,TTTTTTTTT_3,UUUUUUUUUU_3,"${date3.toUTCString()}",CRYPTO_OUTGOING_COMPLETED,300,USD,0.33,ETH,34,35,36,3.4,3.5,3.6,3.7,3.8`,
      ];

      expect(receivedRecords).toHaveLength(1 + 2 + 1); // HEADER + 2 RECORD + EMPTY LINE
      expectedRecords.forEach(record => {
        expect(receivedRecords).toContain(record);
      });
    });
  });

  describe("getUserAchUnsettledTransactionAmount", () => {
    it("should filter all unsettled ach transactions for user", async () => {
      const userId = "fake-user-1234";
      const achPaymentMethodIds = ["fake-id-1", "fake-id-3", "fake-id-4"];

      // Inserting some completed transactions
      await transactionRepo.createTransaction(
        getRandomTransaction("3", {
          userId: userId,
          status: TransactionStatus.COMPLETED,
          fiatPaymentInfo: {
            details: [],
            isCompleted: true,
            isApproved: true,
            isFailed: false,
            paymentMethodID: "fake-id-1",
            paymentID: "checkoutPaymentID",
            paymentProvider: PaymentProvider.CHECKOUT,
          },
        }),
      );

      await transactionRepo.createTransaction(
        getRandomTransaction("5", {
          userId: userId,
          status: TransactionStatus.COMPLETED,
          fiatPaymentInfo: {
            details: [],
            isCompleted: true,
            isApproved: true,
            isFailed: false,
            paymentMethodID: "fake-id-2",
            paymentID: "checkoutPaymentID",
            paymentProvider: PaymentProvider.CHECKOUT,
          },
        }),
      );

      // Insert some unsettled ach payments

      await transactionRepo.createTransaction(
        getRandomTransaction("4", {
          userId: userId,
          status: TransactionStatus.COMPLETED,
          fiatPaymentInfo: {
            details: [],
            isCompleted: false,
            isApproved: true,
            isFailed: false,
            paymentMethodID: "fake-id-3",
            paymentID: "checkoutPaymentID",
            paymentProvider: PaymentProvider.CHECKOUT,
          },
        }),
      );

      await transactionRepo.createTransaction(
        getRandomTransaction("7", {
          userId: userId,
          status: TransactionStatus.COMPLETED,
          fiatPaymentInfo: {
            details: [],
            isCompleted: false,
            isApproved: true,
            isFailed: false,
            paymentMethodID: "fake-id-4",
            paymentID: "checkoutPaymentID",
            paymentProvider: PaymentProvider.CHECKOUT,
          },
        }),
      );

      // Insert some non setted non ach transactions
      await transactionRepo.createTransaction(
        getRandomTransaction("6", {
          userId: userId,
          status: TransactionStatus.COMPLETED,
          fiatPaymentInfo: {
            details: [],
            isCompleted: false,
            isApproved: true,
            isFailed: false,
            paymentMethodID: "fake-id-5",
            paymentID: "checkoutPaymentID",
            paymentProvider: PaymentProvider.CHECKOUT,
          },
        }),
      );

      const totalUnsettledACHTransactionAmount = await transactionRepo.getUserACHUnsettledTransactionAmount(
        userId,
        achPaymentMethodIds,
      );

      expect(totalUnsettledACHTransactionAmount).toBe(2 * TEST_NUMBER);
    });

    it("should return 0 when there is no unsettled ach transaction", async () => {
      const userId = "fake-user-1234";
      const achPaymentMethodIds = ["fake-id-1", "fake-id-3", "fake-id-4"];

      // Inserting some completed transactions
      await transactionRepo.createTransaction(
        getRandomTransaction("3", {
          userId: userId,
          status: TransactionStatus.COMPLETED,
          fiatPaymentInfo: {
            details: [],
            isCompleted: true,
            isApproved: true,
            isFailed: false,
            paymentMethodID: "fake-id-1",
            paymentID: "checkoutPaymentID",
            paymentProvider: PaymentProvider.CHECKOUT,
          },
        }),
      );

      // Insert some non setted non ach transactions
      await transactionRepo.createTransaction(
        getRandomTransaction("6", {
          userId: userId,
          status: TransactionStatus.COMPLETED,
          fiatPaymentInfo: {
            details: [],
            isCompleted: false,
            isApproved: true,
            isFailed: false,
            paymentMethodID: "fake-id-5",
            paymentID: "checkoutPaymentID",
            paymentProvider: PaymentProvider.CHECKOUT,
          },
        }),
      );

      const totalUnsettledACHTransactionAmount = await transactionRepo.getUserACHUnsettledTransactionAmount(
        userId,
        achPaymentMethodIds,
      );

      expect(totalUnsettledACHTransactionAmount).toBe(0);
    });
  });
});

const getRandomTransaction = (
  id: string,
  options: {
    status?: TransactionStatus;
    userId?: string;
    partnerID?: string;
    fiatCurrency?: string;
    cryptoCurrency?: string;
    fiatPaymentInfo?: FiatPaymentInfo;
  } = {},
): Transaction => {
  const props: TransactionProps = {
    _id: mkid(id),
    transactionID: `unique-transaction-id-${id}`,
    userId: options.userId ?? DEFAULT_USER_ID,
    transactionStatus: options.status ?? TransactionStatus.PENDING,
    leg1: options.fiatCurrency ?? "LEG1",
    leg2: options.cryptoCurrency ?? "LEG2",
    type: TransactionType.ONRAMP,
    leg1Amount: TEST_NUMBER,
    leg2Amount: TEST_NUMBER,
    fiatPaymentInfo: options.fiatPaymentInfo ?? {
      details: [],
      isCompleted: true,
      isApproved: true,
      isFailed: false,
      paymentMethodID: "paymentMethodID",
      paymentID: "checkoutPaymentID",
      paymentProvider: PaymentProvider.CHECKOUT,
    },
    cryptoTransactionId: "cryptoTransactionId",
    destinationWalletAddress: "destinationWalletAddress",
    transactionTimestamp: new Date(),
    partnerID: options.partnerID ?? DEFAULT_PARTNER_ID,
    sessionKey: "hefs",
    fixedSide: CurrencyType.FIAT,
    tradeQuoteID: "4242",
    nobaFee: TEST_NUMBER,
    processingFee: TEST_NUMBER,
    networkFee: TEST_NUMBER,
    exchangeRate: TEST_NUMBER,
    buyRate: TEST_NUMBER,
    zhWithdrawalID: mkid(id),
    executedQuoteTradeID: mkid(id),
    executedQuoteSettledTimestamp: TEST_NUMBER,
    executedCrypto: TEST_NUMBER,
    amountPreSpread: TEST_NUMBER,
    lastProcessingTimestamp: TEST_NUMBER,
    lastStatusUpdateTimestamp: TEST_NUMBER,
    discounts: {
      dynamicCreditCardFeeDiscount: 0,
      fixedCreditCardFeeDiscount: 0,
      networkFeeDiscount: 0,
      nobaFeeDiscount: 0,
      spreadDiscount: 0,
    },
  };
  return Transaction.createTransaction(props);
};
