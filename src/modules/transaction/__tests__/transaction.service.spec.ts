import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { ITransactionRepo } from "../repo/transaction.repo";
import { NotFoundError } from "../../../core/exception/CommonAppException";
import { getMockTransactionRepoWithDefaults } from "../mocks/mock.sql.transaction.repo";
import { TRANSACTION_REPO_PROVIDER } from "../repo/transaction.repo.module";
import { instance, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";

const getRandomTransaction = (consumerID: string, isCreditTransaction: boolean = false): Transaction => {
  const transaction: Transaction = {
    transactionRef: uuid(),
    exchangeRate: 1,
    status: TransactionStatus.PENDING,
    workflowName: WorkflowName.CREDIT_CONSUMER_WALLET,
    id: uuid(),
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
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

describe("TransactionServiceTests", () => {
  jest.setTimeout(20000);

  let transactionRepo: ITransactionRepo;
  let app: TestingModule;
  let transactionService: TransactionService;
  let consumerService: ConsumerService;

  beforeEach(async () => {
    transactionRepo = getMockTransactionRepoWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: TRANSACTION_REPO_PROVIDER,
          useFactory: () => instance(transactionRepo),
        },
        TransactionService,
      ],
    }).compile();

    transactionService = app.get<TransactionService>(TransactionService);
  });

  afterAll(async () => {
    app.close();
  });

  // TODO: Skippting as they do not run. Need to add WorkflowExecutor dependencies.
  describe.skip("getTransactionByTransactionRef", () => {
    it("should return the transaction if the debitConsumerID matches", async () => {
      const transaction = getRandomTransaction("consumerID", /* isCreditTransaction */ false);
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);

      const returnedTransaction = await transactionService.getTransactionByTransactionRef(
        transaction.transactionRef,
        "consumerID",
      );
      expect(returnedTransaction).toEqual(transaction);
    });

    it("should return the transaction if the creditConsumerID matches", async () => {
      const transaction = getRandomTransaction("consumerID", /* isCreditTransaction */ true);
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);

      const returnedTransaction = await transactionService.getTransactionByTransactionRef(
        transaction.transactionRef,
        "consumerID",
      );
      expect(returnedTransaction).toEqual(transaction);
    });

    it("should throw NotFoundError if transaction is not found", async () => {
      const transaction = getRandomTransaction("consumerID");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(null);

      await expect(
        transactionService.getTransactionByTransactionRef(transaction.transactionRef, "consumerID"),
      ).rejects.toThrowError(NotFoundError);
    });

    it("should throw NotFoundError if transaction is found 'but' not belong to specified consumer", async () => {
      const transaction = getRandomTransaction("consumerID");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);

      await expect(
        transactionService.getTransactionByTransactionRef(transaction.transactionRef, "anotherConsumerID"),
      ).rejects.toThrowError(NotFoundError);
    });
  });
});