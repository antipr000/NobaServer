import { Transaction as PrismaTransactionModel } from "@prisma/client";
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
  UpdateTransaciton,
  WorkflowName,
} from "../domain/Transaction";
import { ITransactionRepo } from "../repo/transaction.repo";
import { SQLTransactionRepo } from "../repo/sql.transaction.repo";
import { createTestConsumer } from "../../../modules/consumer/test_utils/test.utils";
import {
  BadRequestError,
  DatabaseInternalErrorException,
  NotFoundError,
} from "../../../core/exception/CommonAppException";

const getAllTransactionRecords = async (prismaService: PrismaService): Promise<PrismaTransactionModel[]> => {
  return prismaService.transaction.findMany({});
};

const getRandomTransaction = (consumerID: string, isCreditTransaction = false): InputTransaction => {
  const transaction: InputTransaction = {
    transactionRef: uuid(),
    exchangeRate: 1,
    workflowName: WorkflowName.CREDIT_CONSUMER_WALLET,
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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prismaService.transaction.deleteMany();

    // *****************************  WARNING **********************************
    // *                                                                       *
    // * This can have a potential race condition if the tests run in parallel *
    // *                                                                       *
    // *************************************************************************

    await prismaService.consumer.deleteMany(); // clear all the dependencies
  });

  describe("createTransaction", () => {
    it("should create a transaction (only creditConsumer) with the specified parameters", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = await getRandomTransaction(consumerID, /* isCreditTransaction */ true);
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
        createdTimestamp: returnedTransaction.createdTimestamp,
        updatedTimestamp: returnedTransaction.updatedTimestamp,
      });
    });

    it("should create a transaction (with both credit & debit Consumer) with the specified parameters", async () => {
      const creditConsumerID = await createTestConsumer(prismaService);
      const debitConsumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = await getRandomTransaction(
        creditConsumerID,
        /* isCreditTransaction */ true,
      );
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
        createdTimestamp: returnedTransaction.createdTimestamp,
        updatedTimestamp: returnedTransaction.updatedTimestamp,
      });
    });

    it("should throw an error if the transaction doesn't specify both credit & debit side", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = await getRandomTransaction(
        consumerID,
        /* isCreditTransaction */ false,
      );
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

      const inputTransaction1: InputTransaction = await getRandomTransaction(consumerID);
      await transactionRepo.createTransaction(inputTransaction1);
      const inputTransaction2: InputTransaction = await getRandomTransaction(consumerID);
      inputTransaction2.transactionRef = inputTransaction1.transactionRef;

      await expect(transactionRepo.createTransaction(inputTransaction2)).rejects.toThrowError(
        DatabaseInternalErrorException,
      );
    });

    it("should throw an error if the consumerID is not valid", async () => {
      const inputTransaction: InputTransaction = await getRandomTransaction("invalid-consumer-id");

      await expect(transactionRepo.createTransaction(inputTransaction)).rejects.toThrowError(
        DatabaseInternalErrorException,
      );
    });

    it("should set the default Transaction 'status' to 'PENDING'", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: InputTransaction = await getRandomTransaction(consumerID);
      const returnedTransaction = await transactionRepo.createTransaction(inputTransaction);
      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction.status).toBe(TransactionStatus.PENDING);
      expect(allTransactionRecords).toHaveLength(1);
      expect(allTransactionRecords[0].status).toBe(TransactionStatus.PENDING);
    });
  });

  describe("getTransactionByID", () => {
    it("should return the transaction with the specified ID", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction1: InputTransaction = await getRandomTransaction(consumerID);
      const inputTransaction2: InputTransaction = await getRandomTransaction(consumerID);
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
      const inputTransaction1: InputTransaction = await getRandomTransaction(consumerID);
      const inputTransaction2: InputTransaction = await getRandomTransaction(consumerID);
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
      const inputTransaction1: InputTransaction = await getRandomTransaction(
        consumerID1,
        /* isCreditTransaction */ true,
      );
      const inputTransaction2: InputTransaction = await getRandomTransaction(
        consumerID1,
        /* isCreditTransaction */ true,
      );
      const inputTransaction3: InputTransaction = await getRandomTransaction(
        consumerID2,
        /* isCreditTransaction */ true,
      );
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
      const inputTransaction1: InputTransaction = await getRandomTransaction(
        consumerID1,
        /* isCreditTransaction */ false,
      );
      const inputTransaction2: InputTransaction = await getRandomTransaction(
        consumerID1,
        /* isCreditTransaction */ false,
      );
      const inputTransaction3: InputTransaction = await getRandomTransaction(
        consumerID2,
        /* isCreditTransaction */ false,
      );
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
      const inputTransaction1: InputTransaction = await getRandomTransaction(
        consumerID1,
        /* isCreditTransaction */ false,
      );
      const inputTransaction2: InputTransaction = await getRandomTransaction(
        consumerID1,
        /* isCreditTransaction */ false,
      );
      const inputTransaction3: InputTransaction = await getRandomTransaction(
        consumerID1,
        /* isCreditTransaction */ true,
      );
      const inputTransaction4: InputTransaction = await getRandomTransaction(
        consumerID2,
        /* isCreditTransaction */ false,
      );
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
    it("should update the transaction 'status' for the specified 'transactionRef'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction: InputTransaction = await getRandomTransaction(consumerID);
      const savedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const transactionToUpdates: UpdateTransaciton = {
        status: TransactionStatus.SUCCESS,
      };
      const returnedTransaction = await transactionRepo.updateTransactionByTransactionRef(
        inputTransaction.transactionRef,
        transactionToUpdates,
      );

      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction).toStrictEqual({
        ...savedTransaction,
        status: TransactionStatus.SUCCESS,
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

    it("should update the transaction 'exchangeRate' for the specified 'transactionRef'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction: InputTransaction = await getRandomTransaction(consumerID);
      const savedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const transactionToUpdates: UpdateTransaciton = {
        exchangeRate: 12.34,
      };
      const returnedTransaction = await transactionRepo.updateTransactionByTransactionRef(
        inputTransaction.transactionRef,
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

    it("should update the transaction 'debitCurrency' & 'debitAmount' for the specified 'transactionRef'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction: InputTransaction = await getRandomTransaction(consumerID, /* isCredit */ true);
      const savedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const transactionToUpdates: UpdateTransaciton = {
        debitAmount: 12.34,
        debitCurrency: "USD",
      };
      const returnedTransaction = await transactionRepo.updateTransactionByTransactionRef(
        inputTransaction.transactionRef,
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

    it("should update the transaction 'creditCurrency' & 'creditAmount' for the specified 'transactionRef'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction: InputTransaction = await getRandomTransaction(consumerID, /* isCredit */ false);
      const savedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const transactionToUpdates: UpdateTransaciton = {
        creditAmount: 12.34,
        creditCurrency: "USD",
      };
      const returnedTransaction = await transactionRepo.updateTransactionByTransactionRef(
        inputTransaction.transactionRef,
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

    it("should update all the specified fields of transaction for the specified 'transactionRef'", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const inputTransaction: InputTransaction = await getRandomTransaction(consumerID, /* isCredit */ false);
      const savedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);

      const transactionToUpdates: UpdateTransaciton = {
        exchangeRate: 12.34,
        status: TransactionStatus.IN_PROGRESS,
        creditAmount: 67.89,
        creditCurrency: "USD",
      };
      const returnedTransaction = await transactionRepo.updateTransactionByTransactionRef(
        inputTransaction.transactionRef,
        transactionToUpdates,
      );

      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction).toStrictEqual({
        ...savedTransaction,
        exchangeRate: 12.34,
        creditAmount: 67.89,
        creditCurrency: "USD",
        status: TransactionStatus.IN_PROGRESS,
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

    it("should throw a NotFound error if the transaction with the specified 'transactionRef' does not exist", async () => {
      const updatedTransaction: UpdateTransaciton = {
        status: TransactionStatus.SUCCESS,
      };
      await expect(
        transactionRepo.updateTransactionByTransactionRef("invalid-transaction-ref", updatedTransaction),
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

      await transactionRepo.updateTransactionByTransactionRef(randomTransaction.transactionRef, {
        status: TransactionStatus.SUCCESS,
      });

      const result3 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID,
        transactionStatus: TransactionStatus.SUCCESS,
        pageLimit: 3,
        pageOffset: 1,
      });

      expect(result3.items.length).toBe(1);
      expect(result3.totalItems).toBe(1);
      expect(result3.hasNextPage).toBeFalsy();
      expect(result3.totalPages).toBe(1);

      const result4 = await transactionRepo.getFilteredTransactions({
        consumerID: consumerID,
        transactionStatus: TransactionStatus.SUCCESS,
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
    });
  });
});
