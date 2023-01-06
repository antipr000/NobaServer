import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { InputTransaction, Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { ITransactionRepo } from "../repo/transaction.repo";
import { NotFoundError } from "../../../core/exception/CommonAppException";
import { getMockTransactionRepoWithDefaults } from "../mocks/mock.sql.transaction.repo";
import { TRANSACTION_REPO_PROVIDER } from "../repo/transaction.repo.module";
import { instance, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";

const getRandomTransaction = (consumerID: string, consumerID2?: string, workflowName?: WorkflowName): Transaction => {
  const transaction: Transaction = {
    transactionRef: uuid(),
    exchangeRate: 1,
    status: TransactionStatus.PENDING,
    workflowName: workflowName,
    id: uuid(),
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  switch (workflowName) {
    case WorkflowName.CONSUMER_WALLET_TRANSFER:
      transaction.debitAmount = 100;
      transaction.debitCurrency = "USD";
      transaction.debitConsumerID = consumerID;
      transaction.creditConsumerID = consumerID2;
      break;
    case WorkflowName.DEBIT_CONSUMER_WALLET:
      transaction.debitAmount = 100;
      transaction.debitCurrency = "USD";
      transaction.debitConsumerID = consumerID;
      break;
    case WorkflowName.CREDIT_CONSUMER_WALLET:
      transaction.creditAmount = 100;
      transaction.creditCurrency = "USD";
      transaction.creditConsumerID = consumerID;
      break;
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
      const transaction = getRandomTransaction("consumerID");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);

      const returnedTransaction = await transactionService.getTransactionByTransactionRef(
        transaction.transactionRef,
        "consumerID",
      );
      expect(returnedTransaction).toEqual(transaction);
    });

    it("should return the transaction if the creditConsumerID matches", async () => {
      const transaction = getRandomTransaction("consumerID");
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

  // describe("initiateTransaction", () => {
  //   it("should initiate a transaction", async () => {
  //     const transaction = getRandomTransaction("consumerID");
  //     const transactionDTO: InitiateTransactionDTO = {
  //       debitAmount: transaction.debitAmount,
  //       debitCurrency: transaction.debitCurrency,
  //       debitConsumerID: transaction.debitConsumerID,
  //       exchangeRate: transaction.exchangeRate,
  //       workflowName: transaction.workflowName,
  //     };
  //     when(transactionRepo.createTransaction(transaction)).thenResolve(transaction);

  //     const returnedTransaction = await transactionService.initiateTransaction(transactionDTO, null, null);
  //     expect(returnedTransaction).toEqual(transaction);
  //   });
  // });
});
