import { Transaction as PrismaTransactionModel, TransactionEvent as PrismaTransactionEventModel } from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import {
  InputTransaction,
  Transaction,
  TransactionStatus,
  UpdateTransaction,
  WorkflowName,
} from "../domain/Transaction";
import { ITransactionRepo } from "../repo/transaction.repo";
import { SQLTransactionRepo } from "../repo/sql.transaction.repo";
import { createTestConsumer } from "../../../modules/consumer/test_utils/test.utils";
import {
  BadRequestError,
  DatabaseInternalErrorException,
  InvalidDatabaseRecordException,
  NotFoundError,
} from "../../../core/exception/CommonAppException";
import { InputTransactionEvent } from "../domain/TransactionEvent";
import * as TransactionEventFunctionsForMocking from "../domain/TransactionEvent";

const getAllTransactionRecords = async (prismaService: PrismaService): Promise<PrismaTransactionModel[]> => {
  return prismaService.transaction.findMany({});
};

const getAllTransactionEventRecords = async (prismaService: PrismaService): Promise<PrismaTransactionEventModel[]> => {
  return prismaService.transactionEvent.findMany({});
};

const getRandomTransaction = (consumerID: string, isCreditTransaction = false): InputTransaction => {
  const transaction: InputTransaction = {
    transactionRef: uuid(),
    exchangeRate: 1,
    memo: "New transaction",
    sessionKey: uuid(),
    workflowName: WorkflowName.WALLET_DEPOSIT,
  };

  if (isCreditTransaction) {
    transaction.creditAmount = 100;
    transaction.creditCurrency = "USD";
    transaction.creditConsumerID = consumerID;
  } else {
    transaction.debitAmount = 100;
    transaction.debitCurrency = "USD";
    transaction.debitConsumerID = consumerID;
  }
  return transaction;
};

describe("PostgresTransactionRepoTests", () => {
  jest.setTimeout(20000);

  let transactionRepo: ITransactionRepo;
  let app: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [PrismaService, SQLTransactionRepo],
    }).compile();

    transactionRepo = app.get<SQLTransactionRepo>(SQLTransactionRepo);
    prismaService = app.get<PrismaService>(PrismaService);

    await clearData();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearData();

    jest.restoreAllMocks();
  });

  const clearData = async () => {
    await prismaService.transaction.deleteMany();
    await prismaService.transactionEvent.deleteMany();

    // *****************************  WARNING **********************************
    // *                                                                       *
    // * This can have a potential race condition if the tests run in parallel *
    // *                                                                       *
    // *************************************************************************

    await prismaService.consumer.deleteMany(); // clear all the dependencies
  };

  describe("createTransaction", () => {
    it("should create a transaction (only creditConsumer) with the specified parameters", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = getRandomTransaction(consumerID, /* isCreditTransaction */ true);
      const returnedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);
      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction).toBeDefined();
      expect(returnedTransaction.transactionRef).toBe(inputTransaction.transactionRef);
      expect(returnedTransaction.workflowName).toBe(inputTransaction.workflowName);
      expect(returnedTransaction.creditConsumerID).toBe(inputTransaction.creditConsumerID);
      expect(returnedTransaction.creditAmount).toBe(inputTransaction.creditAmount);
      expect(returnedTransaction.creditCurrency).toBe(inputTransaction.creditCurrency);
      expect(returnedTransaction.debitConsumerID).toBeNull();
      expect(returnedTransaction.debitAmount).toBeNull();
      expect(returnedTransaction.debitCurrency).toBeNull();
      expect(returnedTransaction.exchangeRate).toBe(inputTransaction.exchangeRate);
      expect(returnedTransaction.memo).toBe(inputTransaction.memo);
      expect(returnedTransaction.sessionKey).toBe(inputTransaction.sessionKey);

      expect(allTransactionRecords.length).toBe(1);
      expect(allTransactionRecords[0]).toStrictEqual({
        id: returnedTransaction.id,
        transactionRef: returnedTransaction.transactionRef,
        workflowName: returnedTransaction.workflowName,
        creditConsumerID: returnedTransaction.creditConsumerID,
        creditAmount: returnedTransaction.creditAmount,
        creditCurrency: returnedTransaction.creditCurrency,
        debitConsumerID: null,
        debitAmount: null,
        debitCurrency: null,
        status: returnedTransaction.status,
        exchangeRate: returnedTransaction.exchangeRate,
        memo: returnedTransaction.memo,
        sessionKey: returnedTransaction.sessionKey,
        createdTimestamp: returnedTransaction.createdTimestamp,
        updatedTimestamp: returnedTransaction.updatedTimestamp,
      });
    });

    it("should create a transaction (with both credit & debit Consumer) with the specified parameters", async () => {
      const creditConsumerID = await createTestConsumer(prismaService);
      const debitConsumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = getRandomTransaction(creditConsumerID, /* isCreditTransaction */ true);
      inputTransaction.debitConsumerID = debitConsumerID;
      inputTransaction.debitAmount = 200;
      inputTransaction.debitCurrency = "USD";

      const returnedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);
      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction).toBeDefined();
      expect(returnedTransaction.transactionRef).toBe(inputTransaction.transactionRef);
      expect(returnedTransaction.workflowName).toBe(inputTransaction.workflowName);
      expect(returnedTransaction.creditConsumerID).toBe(inputTransaction.creditConsumerID);
      expect(returnedTransaction.creditAmount).toBe(inputTransaction.creditAmount);
      expect(returnedTransaction.creditCurrency).toBe(inputTransaction.creditCurrency);
      expect(returnedTransaction.debitConsumerID).toBe(inputTransaction.debitConsumerID);
      expect(returnedTransaction.debitAmount).toBe(inputTransaction.debitAmount);
      expect(returnedTransaction.debitCurrency).toBe(inputTransaction.debitCurrency);
      expect(returnedTransaction.exchangeRate).toBe(inputTransaction.exchangeRate);
      expect(returnedTransaction.memo).toBe(inputTransaction.memo);
      expect(returnedTransaction.sessionKey).toBe(inputTransaction.sessionKey);

      expect(allTransactionRecords.length).toBe(1);
      expect(allTransactionRecords[0]).toStrictEqual({
        id: returnedTransaction.id,
        transactionRef: returnedTransaction.transactionRef,
        workflowName: returnedTransaction.workflowName,
        creditConsumerID: returnedTransaction.creditConsumerID,
        creditAmount: returnedTransaction.creditAmount,
        creditCurrency: returnedTransaction.creditCurrency,
        debitConsumerID: returnedTransaction.debitConsumerID,
        debitAmount: returnedTransaction.debitAmount,
        debitCurrency: returnedTransaction.debitCurrency,
        status: returnedTransaction.status,
        exchangeRate: returnedTransaction.exchangeRate,
        memo: returnedTransaction.memo,
        sessionKey: returnedTransaction.sessionKey,
        createdTimestamp: returnedTransaction.createdTimestamp,
        updatedTimestamp: returnedTransaction.updatedTimestamp,
      });
    });

    it("should throw an error if the transaction doesn't specify both credit & debit side", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = getRandomTransaction(consumerID, /* isCreditTransaction */ false);
      delete inputTransaction.debitAmount;
      delete inputTransaction.debitCurrency;

      try {
        await transactionRepo.createTransaction(inputTransaction);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toBe("Transaction must have either a debit or credit side.");
      }
    });

    it("should throw an error if the transactionRef is not unique", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction1: InputTransaction = getRandomTransaction(consumerID);
      await transactionRepo.createTransaction(inputTransaction1);
      const inputTransaction2: InputTransaction = getRandomTransaction(consumerID);
      inputTransaction2.transactionRef = inputTransaction1.transactionRef;

      await expect(transactionRepo.createTransaction(inputTransaction2)).rejects.toThrowError(
        DatabaseInternalErrorException,
      );
    });

    it("should throw an error if the consumerID is not valid", async () => {
      const inputTransaction: InputTransaction = getRandomTransaction("invalid-consumer-id");

      await expect(transactionRepo.createTransaction(inputTransaction)).rejects.toThrowError(
        DatabaseInternalErrorException,
      );
    });

    it("should set the default Transaction 'status' to 'PENDING'", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = getRandomTransaction(consumerID);
      const returnedTransaction = await transactionRepo.createTransaction(inputTransaction);
      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction.status).toBe(TransactionStatus.INITIATED);
      expect(allTransactionRecords).toHaveLength(1);
      expect(allTransactionRecords[0].status).toBe(TransactionStatus.INITIATED);
    });
  });

  describe("getTransactionByID", () => {
    it("should return the transaction with the specified ID", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction1: InputTransaction = getRandomTransaction(consumerID);
      const inputTransaction2: InputTransaction = getRandomTransaction(consumerID);
      const savedTransaction1 = await transactionRepo.createTransaction(inputTransaction1);
      const savedTransaction2 = await transactionRepo.createTransaction(inputTransaction2);

      const returnedTransaction1 = await transactionRepo.getTransactionByID(savedTransaction1.id);
      const returnedTransaction2 = await transactionRepo.getTransactionByID(savedTransaction2.id);

      expect(returnedTransaction1).not.toBeNull();
      expect(returnedTransaction1).toStrictEqual(savedTransaction1);
      expect(returnedTransaction2).not.toBeNull();
      expect(returnedTransaction2).toStrictEqual(savedTransaction2);
    });

    it("should return 'null' if the transaction with the specified ID does not exist", async () => {
      const returnedTransaction = await transactionRepo.getTransactionByID("invalid-id");

      expect(returnedTransaction).toBeNull();
    });
  });

  describe("getTransactionByTransactionRef", () => {
    it("should return the transaction with the specified transactionRef", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction1: InputTransaction = getRandomTransaction(consumerID);
      const inputTransaction2: InputTransaction = getRandomTransaction(consumerID);
      const savedTransaction1 = await transactionRepo.createTransaction(inputTransaction1);
      const savedTransaction2 = await transactionRepo.createTransaction(inputTransaction2);

      const returnedTransaction1 = await transactionRepo.getTransactionByTransactionRef(
        savedTransaction1.transactionRef,
      );
      const returnedTransaction2 = await transactionRepo.getTransactionByTransactionRef(
        savedTransaction2.transactionRef,
      );

      expect(returnedTransaction1).not.toBeNull();
      expect(returnedTransaction1).toStrictEqual(savedTransaction1);
      expect(returnedTransaction2).not.toBeNull();
      expect(returnedTransaction2).toStrictEqual(savedTransaction2);
    });

    it("should return 'null' if the transaction with the specified transactionRef does not exist", async () => {
      const returnedTransaction = await transactionRepo.getTransactionByTransactionRef("invalid-transaction-ref");

      expect(returnedTransaction).toBeNull();
    });
  });

  describe("getTransactionsByConsumerID", () => {
    it("should return all transactions (with creditConsumer) with the specified consumerID", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const consumerID2 = await createTestConsumer(prismaService);
      const inputTransaction1: InputTransaction = getRandomTransaction(consumerID1, /* isCreditTransaction */ true);
      const inputTransaction2: InputTransaction = getRandomTransaction(consumerID1, /* isCreditTransaction */ true);
      const inputTransaction3: InputTransaction = getRandomTransaction(consumerID2, /* isCreditTransaction */ true);
      const savedTransaction1 = await transactionRepo.createTransaction(inputTransaction1);
      const savedTransaction2 = await transactionRepo.createTransaction(inputTransaction2);
      const savedTransaction3 = await transactionRepo.createTransaction(inputTransaction3);

      const returnedTransactions = await transactionRepo.getTransactionsByConsumerID(consumerID1);

      expect(returnedTransactions).toHaveLength(2);
      expect(returnedTransactions).toContainEqual(savedTransaction1);
      expect(returnedTransactions).toContainEqual(savedTransaction2);
      expect(returnedTransactions).not.toContainEqual(savedTransaction3);
    });

    it("should return all transactions (with debitConsumer) with the specified consumerID", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const consumerID2 = await createTestConsumer(prismaService);
      const inputTransaction1: InputTransaction = getRandomTransaction(consumerID1, /* isCreditTransaction */ false);
      const inputTransaction2: InputTransaction = getRandomTransaction(consumerID1, /* isCreditTransaction */ false);
      const inputTransaction3: InputTransaction = getRandomTransaction(consumerID2, /* isCreditTransaction */ false);
      const savedTransaction1 = await transactionRepo.createTransaction(inputTransaction1);
      const savedTransaction2 = await transactionRepo.createTransaction(inputTransaction2);
      const savedTransaction3 = await transactionRepo.createTransaction(inputTransaction3);

      const returnedTransactions = await transactionRepo.getTransactionsByConsumerID(consumerID1);

      expect(returnedTransactions).toHaveLength(2);
      expect(returnedTransactions).toContainEqual(savedTransaction1);
      expect(returnedTransactions).toContainEqual(savedTransaction2);
      expect(returnedTransactions).not.toContainEqual(savedTransaction3);
    });

    it("should return all transactions (with either debit or credit Consumer matching) with the specified consumerID", async () => {
      const consumerID1 = await createTestConsumer(prismaService);
      const consumerID2 = await createTestConsumer(prismaService);
      const inputTransaction1: InputTransaction = getRandomTransaction(consumerID1, /* isCreditTransaction */ false);
      const inputTransaction2: InputTransaction = getRandomTransaction(consumerID1, /* isCreditTransaction */ false);
      const inputTransaction3: InputTransaction = getRandomTransaction(consumerID1, /* isCreditTransaction */ true);
      const inputTransaction4: InputTransaction = getRandomTransaction(consumerID2, /* isCreditTransaction */ false);
      const savedTransaction1 = await transactionRepo.createTransaction(inputTransaction1);
      const savedTransaction2 = await transactionRepo.createTransaction(inputTransaction2);
      const savedTransaction3 = await transactionRepo.createTransaction(inputTransaction3);
      const savedTransaction4 = await transactionRepo.createTransaction(inputTransaction4);

      const returnedTransactions = await transactionRepo.getTransactionsByConsumerID(consumerID1);

      expect(returnedTransactions).toHaveLength(3);
      expect(returnedTransactions).toContainEqual(savedTransaction1);
      expect(returnedTransactions).toContainEqual(savedTransaction2);
      expect(returnedTransactions).toContainEqual(savedTransaction3);
      expect(returnedTransactions).not.toContainEqual(savedTransaction4);
    });

    it("should return an empty array if there are no transactions with the specified consumerID", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const returnedTransactions = await transactionRepo.getTransactionsByConsumerID(consumerID);

      expect(returnedTransactions).toHaveLength(0);
    });
  });

  describe("updateTransaction", () => {
    it("should update the transaction 'status' for the specified 'id'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction: InputTransaction = getRandomTransaction(consumerID);
      const savedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const transactionToUpdates: UpdateTransaction = {
        status: TransactionStatus.COMPLETED,
      };
      const returnedTransaction = await transactionRepo.updateTransactionByTransactionID(
        savedTransaction.id,
        transactionToUpdates,
      );

      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction).toStrictEqual({
        ...savedTransaction,
        status: TransactionStatus.COMPLETED,
        updatedTimestamp: expect.any(Date),
      });
      expect(returnedTransaction.updatedTimestamp.valueOf()).toBeGreaterThan(
        savedTransaction.updatedTimestamp.valueOf(),
      );
      expect(allTransactionRecords).toHaveLength(1);
      expect({
        ...returnedTransaction,
        createdTimestamp: returnedTransaction.createdTimestamp,
        updatedTimestamp: returnedTransaction.updatedTimestamp,
      }).toMatchObject(allTransactionRecords[0]);
    });

    it("should update the transaction 'exchangeRate' for the specified transaction ID", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction: InputTransaction = getRandomTransaction(consumerID);
      const savedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const transactionToUpdates: UpdateTransaction = {
        exchangeRate: 12.34,
      };
      const returnedTransaction = await transactionRepo.updateTransactionByTransactionID(
        savedTransaction.id,
        transactionToUpdates,
      );

      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction).toStrictEqual({
        ...savedTransaction,
        exchangeRate: 12.34,
        updatedTimestamp: expect.any(Date),
      });
      expect(returnedTransaction.updatedTimestamp.valueOf()).toBeGreaterThan(
        savedTransaction.updatedTimestamp.valueOf(),
      );
      expect(allTransactionRecords).toHaveLength(1);
      expect(returnedTransaction).toMatchObject(allTransactionRecords[0]);
    });

    it("should update the transaction 'debitCurrency' & 'debitAmount' for the specified transaction ID", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction: InputTransaction = getRandomTransaction(consumerID, /* isCredit */ true);
      const savedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const transactionToUpdates: UpdateTransaction = {
        debitAmount: 12.34,
        debitCurrency: "USD",
      };
      const returnedTransaction = await transactionRepo.updateTransactionByTransactionID(
        savedTransaction.id,
        transactionToUpdates,
      );

      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction).toStrictEqual({
        ...savedTransaction,
        debitAmount: 12.34,
        debitCurrency: "USD",
        updatedTimestamp: expect.any(Date),
      });
      expect(returnedTransaction.updatedTimestamp.valueOf()).toBeGreaterThan(
        savedTransaction.updatedTimestamp.valueOf(),
      );
      expect(allTransactionRecords).toHaveLength(1);
      expect(returnedTransaction).toMatchObject(allTransactionRecords[0]);
    });

    it("should update the transaction 'creditCurrency' & 'creditAmount' for the specified transaction ID", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction: InputTransaction = getRandomTransaction(consumerID, /* isCredit */ false);
      const savedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const transactionToUpdates: UpdateTransaction = {
        creditAmount: 12.34,
        creditCurrency: "USD",
      };
      const returnedTransaction = await transactionRepo.updateTransactionByTransactionID(
        savedTransaction.id,
        transactionToUpdates,
      );

      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction).toStrictEqual({
        ...savedTransaction,
        creditAmount: 12.34,
        creditCurrency: "USD",
        updatedTimestamp: expect.any(Date),
      });
      expect(returnedTransaction.updatedTimestamp.valueOf()).toBeGreaterThan(
        savedTransaction.updatedTimestamp.valueOf(),
      );
      expect(allTransactionRecords).toHaveLength(1);
      expect(returnedTransaction).toMatchObject(allTransactionRecords[0]);
    });

    it("should update all the specified fields of transaction for the specified transaction ID", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction: InputTransaction = getRandomTransaction(consumerID, /* isCredit */ false);
      const savedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const transactionToUpdates: UpdateTransaction = {
        exchangeRate: 12.34,
        status: TransactionStatus.PROCESSING,
        creditAmount: 67.89,
        creditCurrency: "USD",
      };
      const returnedTransaction = await transactionRepo.updateTransactionByTransactionID(
        savedTransaction.id,
        transactionToUpdates,
      );

      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction).toStrictEqual({
        ...savedTransaction,
        exchangeRate: 12.34,
        creditAmount: 67.89,
        creditCurrency: "USD",
        status: TransactionStatus.PROCESSING,
        updatedTimestamp: expect.any(Date),
      });
      expect(returnedTransaction.updatedTimestamp.valueOf()).toBeGreaterThan(
        savedTransaction.updatedTimestamp.valueOf(),
      );
      expect(allTransactionRecords).toHaveLength(1);
      expect({
        ...returnedTransaction,
        createdTimestamp: returnedTransaction.createdTimestamp,
        updatedTimestamp: returnedTransaction.updatedTimestamp,
      }).toMatchObject(allTransactionRecords[0]);
    });

    it("should throw a NotFound error if the transaction with the specified transaction ID does not exist", async () => {
      const updatedTransaction: UpdateTransaction = {
        status: TransactionStatus.COMPLETED,
      };
      await expect(
        transactionRepo.updateTransactionByTransactionID("invalid-transaction-ref", updatedTransaction),
      ).rejects.toThrowError(NotFoundError);
    });
  });

  describe("getFilteredTransactions", () => {
    it("should return filtered transactions for consumer", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const consumerID2 = await createTestConsumer(prismaService);

      await transactionRepo.createTransaction(getRandomTransaction(consumerID));
      await transactionRepo.createTransaction(getRandomTransaction(consumerID, true));
      await transactionRepo.createTransaction(getRandomTransaction(consumerID2));
      await transactionRepo.createTransaction(getRandomTransaction(consumerID));
      await transactionRepo.createTransaction(getRandomTransaction(consumerID));
      await transactionRepo.createTransaction(getRandomTransaction(consumerID2));
      const randomTransaction = await transactionRepo.createTransaction(getRandomTransaction(consumerID, true));

      const result1 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID,
        pageLimit: 3,
        pageOffset: 1,
      });

      expect(result1.items.length).toBe(3);
      expect(result1.hasNextPage).toBeTruthy();
      expect(result1.totalItems).toBe(5);
      expect(result1.totalPages).toBe(2);

      const result2 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID,
        pageLimit: 3,
        pageOffset: 2,
      });

      expect(result2.items.length).toBe(2);
      expect(result2.hasNextPage).toBeFalsy();
      expect(result2.totalPages).toBe(2);

      await transactionRepo.updateTransactionByTransactionID(randomTransaction.id, {
        status: TransactionStatus.COMPLETED,
      });

      const result3 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID,
        transactionStatus: TransactionStatus.COMPLETED,
        pageLimit: 3,
        pageOffset: 1,
      });

      expect(result3.items.length).toBe(1);
      expect(result3.totalItems).toBe(1);
      expect(result3.hasNextPage).toBeFalsy();
      expect(result3.totalPages).toBe(1);

      const result4 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID,
        transactionStatus: TransactionStatus.COMPLETED,
        pageLimit: 3,
        pageOffset: 2,
      });

      expect(result4.items.length).toBe(0);

      const result5 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID2,
        pageLimit: 4,
        pageOffset: 1,
      });

      expect(result5.items.length).toBe(2);
      expect(result5.hasNextPage).toBeFalsy();

      const result6 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID,
        creditCurrency: "USD",
        pageLimit: 3,
        pageOffset: 1,
      });

      expect(result6.items.length).toBe(2);
      expect(result6.hasNextPage).toBeFalsy();
      expect(result6.totalPages).toBe(1);

      const result7 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID,
        debitCurrency: "USD",
        pageLimit: 2,
        pageOffset: 1,
      });

      expect(result7.items).toHaveLength(2);
      expect(result7.hasNextPage).toBeTruthy();
      expect(result7.totalItems).toBe(3);
      expect(result7.totalPages).toBe(2);

      const olderTransaction = getRandomTransaction(consumerID);
      await prismaService.transaction.create({
        data: {
          ...olderTransaction,
          createdTimestamp: new Date("2020-01-01"),
          updatedTimestamp: new Date("2020-01-01"),
        },
      });

      const result8 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID,
        endDate: new Date("2020-01-02").toUTCString(),
        pageLimit: 3,
        pageOffset: 1,
      });

      expect(result8.items).toHaveLength(1);
      expect(result8.hasNextPage).toBeFalsy();
      expect(result8.items[0].transactionRef).toBe(olderTransaction.transactionRef);

      const result9 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID,
        startDate: new Date("2020-01-02").toUTCString(),
        endDate: new Date("2020-01-03").toUTCString(),
        pageLimit: 3,
        pageOffset: 1,
      });

      expect(result9.items).toHaveLength(0);
      expect(result9.totalItems).toBe(0);

      const result10 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID,
        startDate: new Date("2020-01-01").toUTCString(),
        endDate: new Date("2020-01-02").toUTCString(),
      });

      expect(result10.items).toHaveLength(1);
      expect(result10.totalItems).toBe(1);
      expect(result10.totalPages).toBe(1);
    });
  });

  describe("addTransactionEvent", () => {
    it("should add an event to a transaction with the minimum parameters", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = getRandomTransaction(consumerID, /* isCreditTransaction */ true);
      const returnedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: returnedTransaction.id,
        internal: false,
        message: "Test event - minimum params",
      };
      const returnedTransactionEvent = await transactionRepo.addTransactionEvent(inputTransactionEvent);

      expect(returnedTransactionEvent).toBeDefined();
      expect(returnedTransactionEvent.id).toBeDefined();
      expect(returnedTransactionEvent.timestamp).toBeDefined();
      expect(returnedTransactionEvent.transactionID).toBe(inputTransactionEvent.transactionID);
      expect(returnedTransactionEvent.internal).toBe(inputTransactionEvent.internal);
      expect(returnedTransactionEvent.message).toBe(inputTransactionEvent.message);
      expect(returnedTransactionEvent.details).toBeNull();
      expect(returnedTransactionEvent.key).toBeNull();
      expect(returnedTransactionEvent.param1).toBeNull();
      expect(returnedTransactionEvent.param2).toBeNull();
      expect(returnedTransactionEvent.param3).toBeNull();
      expect(returnedTransactionEvent.param4).toBeNull();
      expect(returnedTransactionEvent.param5).toBeNull();

      const allTransactionEvents: PrismaTransactionEventModel[] = await getAllTransactionEventRecords(prismaService);

      expect(allTransactionEvents.length).toBe(1);
      expect(allTransactionEvents[0]).toStrictEqual({
        id: returnedTransactionEvent.id,
        timestamp: returnedTransactionEvent.timestamp,
        transactionID: returnedTransactionEvent.transactionID,
        internal: returnedTransactionEvent.internal,
        message: returnedTransactionEvent.message,
        details: returnedTransactionEvent.details,
        key: returnedTransactionEvent.key,
        param1: returnedTransactionEvent.param1,
        param2: returnedTransactionEvent.param2,
        param3: returnedTransactionEvent.param3,
        param4: returnedTransactionEvent.param4,
        param5: returnedTransactionEvent.param5,
      });
    });

    it("should add an event to a transaction with all parameters", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = getRandomTransaction(consumerID, /* isCreditTransaction */ true);
      const returnedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: returnedTransaction.id,
        internal: false,
        message: "Test event - all params",
        details: "This is a test event",
        key: "testKey",
        param1: "param1 value",
        param2: "param2 value",
        param3: "param3 value",
        param4: "param4 value",
        param5: "param5 value",
      };
      const returnedTransactionEvent = await transactionRepo.addTransactionEvent(inputTransactionEvent);

      expect(returnedTransactionEvent).toBeDefined();
      expect(returnedTransactionEvent.id).toBeDefined();
      expect(returnedTransactionEvent.timestamp).toBeDefined();
      expect(returnedTransactionEvent.transactionID).toBe(inputTransactionEvent.transactionID);
      expect(returnedTransactionEvent.internal).toBe(inputTransactionEvent.internal);
      expect(returnedTransactionEvent.message).toBe(inputTransactionEvent.message);
      expect(returnedTransactionEvent.details).toBe(inputTransactionEvent.details);
      expect(returnedTransactionEvent.key).toBe(inputTransactionEvent.key);
      expect(returnedTransactionEvent.param1).toBe(inputTransactionEvent.param1);
      expect(returnedTransactionEvent.param2).toBe(inputTransactionEvent.param2);
      expect(returnedTransactionEvent.param3).toBe(inputTransactionEvent.param3);
      expect(returnedTransactionEvent.param4).toBe(inputTransactionEvent.param4);
      expect(returnedTransactionEvent.param5).toBe(inputTransactionEvent.param5);

      const allTransactionEvents: PrismaTransactionEventModel[] = await getAllTransactionEventRecords(prismaService);

      expect(allTransactionEvents.length).toBe(1);
      expect(allTransactionEvents[0]).toStrictEqual({
        id: returnedTransactionEvent.id,
        timestamp: returnedTransactionEvent.timestamp,
        transactionID: returnedTransactionEvent.transactionID,
        internal: returnedTransactionEvent.internal,
        message: returnedTransactionEvent.message,
        details: returnedTransactionEvent.details,
        key: returnedTransactionEvent.key,
        param1: returnedTransactionEvent.param1,
        param2: returnedTransactionEvent.param2,
        param3: returnedTransactionEvent.param3,
        param4: returnedTransactionEvent.param4,
        param5: returnedTransactionEvent.param5,
      });
    });

    /* TODO: Flaky test - fix this post-MVP
    it("should throw a InvalidDatabaseRecordException if creation succeeds but the object fails Joi validation", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = getRandomTransaction(consumerID, true);
      const returnedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: returnedTransaction.id,
        internal: false,
        message: "Test event - all params",
        details: "This is a test event",
        key: "testKey",
        param1: "param1 value",
        param2: "param2 value",
        param3: "param3 value",
        param4: "param4 value",
        param5: "param5 value",
      };

      jest.spyOn(TransactionEventFunctionsForMocking, "validateSavedTransactionEvent").mockImplementation(() => {
        throw new Error("Error");
      });

      expect(async () => await transactionRepo.addTransactionEvent(inputTransactionEvent)).rejects.toThrow(
        InvalidDatabaseRecordException,
      );
    });*/

    it("should throw a DatabaseInternalErrorException if there's an error creating the transactionEvent", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = getRandomTransaction(consumerID, /* isCreditTransaction */ true);
      const returnedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: returnedTransaction.id,
        internal: false,
        message: "Test event - all params",
        details: "This is a test event",
        key: "testKey",
        param1: "param1 value",
        param2: "param2 value",
        param3: "param3 value",
        param4: "param4 value",
        param5: "param5 value",
      };

      jest.spyOn(prismaService.transactionEvent, "create").mockImplementation(() => {
        throw new Error("Error");
      });

      expect(async () => await transactionRepo.addTransactionEvent(inputTransactionEvent)).rejects.toThrow(
        DatabaseInternalErrorException,
      );
    });
  });

  describe("getTransactionEvents", () => {
    it("should get all transaction events assocated with a transaction with proper filtering", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = getRandomTransaction(consumerID, /* isCreditTransaction */ true);
      const returnedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const inputTransactionEvent1: InputTransactionEvent = {
        transactionID: returnedTransaction.id,
        internal: false,
        message: "Test event - minimum params",
      };

      const inputTransactionEvent2: InputTransactionEvent = {
        transactionID: returnedTransaction.id,
        internal: true,
        message: "Test event - all params",
        details: "This is a test event",
        key: "testKey",
        param1: "param1 value",
        param2: "param2 value",
        param3: "param3 value",
        param4: "param4 value",
        param5: "param5 value",
      };

      const returnedTransactionEvent1 = await transactionRepo.addTransactionEvent(inputTransactionEvent1);
      const returnedTransactionEvent2 = await transactionRepo.addTransactionEvent(inputTransactionEvent2);

      // Get all events, including internal
      const returnedTransactionEvents = await transactionRepo.getTransactionEvents(returnedTransaction.id, true);

      expect(returnedTransactionEvents.length).toBe(2);
      expect(returnedTransactionEvents[0]).toStrictEqual(returnedTransactionEvent1);
      expect(returnedTransactionEvents[1]).toStrictEqual(returnedTransactionEvent2);

      // Exclude internal events
      const returnedTransactionEventsInternalOnly = await transactionRepo.getTransactionEvents(
        returnedTransaction.id,
        false,
      );
      expect(returnedTransactionEventsInternalOnly.length).toBe(1);
      expect(returnedTransactionEventsInternalOnly[0]).toStrictEqual(returnedTransactionEvent1);
    });

    it("should return empty array if no results found", async () => {
      const returnedTransactionEvents = await transactionRepo.getTransactionEvents("12345", true);
      expect(returnedTransactionEvents.length).toBe(0);
    });
  });
});
