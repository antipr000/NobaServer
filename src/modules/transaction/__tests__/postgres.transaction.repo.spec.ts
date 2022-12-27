import { Transaction as PrismaTransactionModel } from "@prisma/client";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { ITransactionRepo } from "../repo/transaction.repo";
import { PostgresTransactionRepo } from "../repo/postgres.transaction.repo";
import { createTestConsumer } from "../../../modules/consumer/test_utils/test.utils";
import { DatabaseInternalErrorException } from "../../../core/exception/CommonAppException";

const getAllTransactionRecords = async (prismaService: PrismaService): Promise<PrismaTransactionModel[]> => {
  return prismaService.transaction.findMany({});
};

const getRandomTransaction = (consumerID: string): Transaction => {
  return {
    transactionRef: uuid(),
    amount: 100,
    consumerID: consumerID,
    currency: "USD",
    exchangeRate: 1,
    status: TransactionStatus.PENDING,
    workflowName: WorkflowName.BANK_TO_NOBA_WALLET,
    id: uuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
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
      providers: [PrismaService, PostgresTransactionRepo],
    }).compile();

    transactionRepo = app.get<PostgresTransactionRepo>(PostgresTransactionRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    app.close();
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
    it("should create a transaction with the specified parameters & ignores the 'createdAt', 'updatedAt' & 'id' field", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: Transaction = await getRandomTransaction(consumerID);
      const returnedTransaction: Transaction = await transactionRepo.createTransaction(inputTransaction);
      const allTransactionRecords: PrismaTransactionModel[] = await getAllTransactionRecords(prismaService);

      expect(returnedTransaction).toBeDefined();
      expect(returnedTransaction.id).not.toBe(inputTransaction.id);
      expect(returnedTransaction.createdAt.valueOf()).not.toBe(inputTransaction.createdAt.valueOf());
      expect(returnedTransaction.updatedAt.valueOf()).not.toBe(inputTransaction.updatedAt.valueOf());

      expect(returnedTransaction.transactionRef).toBe(inputTransaction.transactionRef);
      expect(returnedTransaction.workflowName).toBe(inputTransaction.workflowName);
      expect(returnedTransaction.consumerID).toBe(inputTransaction.consumerID);
      expect(returnedTransaction.amount).toBe(inputTransaction.amount);
      expect(returnedTransaction.currency).toBe(inputTransaction.currency);
      expect(returnedTransaction.status).toBe(inputTransaction.status);
      expect(returnedTransaction.exchangeRate).toBe(inputTransaction.exchangeRate);

      expect(allTransactionRecords.length).toBe(1);
      expect(allTransactionRecords[0]).toStrictEqual({
        id: returnedTransaction.id,
        transactionRef: returnedTransaction.transactionRef,
        workflowName: returnedTransaction.workflowName,
        consumerID: returnedTransaction.consumerID,
        amount: returnedTransaction.amount,
        currency: returnedTransaction.currency,
        status: returnedTransaction.status,
        exchangeRate: returnedTransaction.exchangeRate,
        createdTimestamp: returnedTransaction.createdAt,
        updatedTimestamp: returnedTransaction.updatedAt,
      });
    });

    it("should throw an error if the transactionRef is not unique", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction1: Transaction = await getRandomTransaction(consumerID);
      await transactionRepo.createTransaction(inputTransaction1);
      const inputTransaction2: Transaction = await getRandomTransaction(consumerID);
      inputTransaction2.transactionRef = inputTransaction1.transactionRef;

      await expect(transactionRepo.createTransaction(inputTransaction2)).rejects.toThrowError(
        DatabaseInternalErrorException,
      );
    });

    it("should throw an error if the consumerID is not valid", async () => {
      const inputTransaction: Transaction = await getRandomTransaction("invalid-consumer-id");

      await expect(transactionRepo.createTransaction(inputTransaction)).rejects.toThrowError(
        DatabaseInternalErrorException,
      );
    });

    it("should set the default Transaction 'status' to 'PENDING'", async () => {
      const consumerID = await createTestConsumer(prismaService);

      const inputTransaction: Transaction = await getRandomTransaction(consumerID);
      delete inputTransaction.status;

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
      const inputTransaction1: Transaction = await getRandomTransaction(consumerID);
      const inputTransaction2: Transaction = await getRandomTransaction(consumerID);
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
      const inputTransaction1: Transaction = await getRandomTransaction(consumerID);
      const inputTransaction2: Transaction = await getRandomTransaction(consumerID);
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
});
