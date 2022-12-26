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

const getAllTransactionRecords = async (prismaService: PrismaService): Promise<PrismaTransactionModel[]> => {
  return prismaService.transaction.findMany({});
};

const getRandomTransaction = async (prismaService: PrismaService): Promise<Transaction> => {
  const consumerID = await createTestConsumer(prismaService);

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
      const inputTransaction: Transaction = await getRandomTransaction(prismaService);
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
  });
});
