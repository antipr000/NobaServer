import { TestingModule, Test } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { MONGO_CONFIG_KEY, MONGO_URI, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import mongoose from "mongoose";
import { MongoClient, Collection } from "mongodb";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { Transaction, TransactionProps } from "../domain/Transaction";
import { ITransactionRepo } from "../repo/TransactionRepo";
import { MongoDBTransactionRepo } from "../repo/MongoDBTransactionRepo";
import { TransactionMapper } from "../mapper/TransactionMapper";
import { TransactionStatus, TransactionType } from "../domain/Types";
import { CurrencyType } from "../../../../src/modules/common/domain/Types";

const TRANSACTION_ID_PREFIX = "transaction_id_prefix";
const TEST_NUMBER = 5;
const DEFAULT_USER_ID = "user_id";
const DEFAULT_PARTNER_ID = "partener_id";

const mkid = (id: string): string => {
  return TRANSACTION_ID_PREFIX + id;
};

const getAllRecordsInTransactionCollection = async (transactionCollection: Collection): Promise<Array<Transaction>> => {
  const adminDocumentsCursor = transactionCollection.find({});
  const allRecords: Transaction[] = [];

  while (await adminDocumentsCursor.hasNext()) {
    const adminDocument = await adminDocumentsCursor.next();

    const currentRecord: Transaction = Transaction.createTransaction({
      ...adminDocument,
      _id: adminDocument._id.toString(),
    });
    allRecords.push(currentRecord);
  }

  return allRecords;
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

  describe("getUserTransactions", () => {
    it("should get all transactions for a user", async () => {
      //  2 transaction already exists in beforeEachStep, will add 2 more transaction one with different user and one with same user but different partner
      await transactionRepo.createTransaction(
        getRandomTransaction("3", { userId: "differentUser", partnerID: DEFAULT_PARTNER_ID }),
      );
      await transactionRepo.createTransaction(getRandomTransaction("4", { partnerID: "partner1" }));
      const ts: Transaction[] = await transactionRepo.getUserTransactions(DEFAULT_USER_ID, DEFAULT_PARTNER_ID);

      expect(ts).toHaveLength(2);

      const allPartnersTs: Transaction[] = await transactionRepo.getUserTransactions(DEFAULT_USER_ID, undefined);
      expect(allPartnersTs).toHaveLength(3);
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
});

const getRandomTransaction = (
  id: string,
  options: { status?: TransactionStatus; userId?: string; partnerID?: string } = {},
): Transaction => {
  const props: TransactionProps = {
    _id: mkid(id),
    userId: options.userId ?? DEFAULT_USER_ID,
    transactionStatus: options.status ?? TransactionStatus.PENDING,
    leg1: "leg1",
    leg2: "leg2",
    type: TransactionType.ONRAMP,
    leg1Amount: TEST_NUMBER,
    leg2Amount: TEST_NUMBER,
    paymentMethodID: "paymentMethodID",
    checkoutPaymentID: "checkoutPaymentID",
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
  };
  return Transaction.createTransaction(props);
};
