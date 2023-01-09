import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { v4 } from "uuid";
import { InputTransaction, Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { ITransactionRepo } from "../repo/transaction.repo";
import { getMockTransactionRepoWithDefaults } from "../mocks/mock.sql.transaction.repo";
import { TRANSACTION_REPO_PROVIDER } from "../repo/transaction.repo.module";
import { deepEqual, instance, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { Currency } from "../domain/TransactionTypes";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { getMockWorkflowExecutorWithDefaults } from "../mocks/mock.workflow.executor";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { Utils } from "../../../core/utils/Utils";
import { IConsumerRepo } from "../../../modules/consumer/repos/consumer.repo";
import { getMockConsumerRepoWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.repo";
import { ServiceException } from "../../../core/exception/ServiceException";

describe("TransactionServiceTests", () => {
  jest.setTimeout(20000);

  let transactionRepo: ITransactionRepo;
  let app: TestingModule;
  let transactionService: TransactionService;
  let consumerService: ConsumerService;
  let consumerRepo: IConsumerRepo;
  let workflowExecutor: WorkflowExecutor;

  beforeAll(async () => {
    transactionRepo = getMockTransactionRepoWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    consumerRepo = getMockConsumerRepoWithDefaults(); // TODO: may not need this
    workflowExecutor = getMockWorkflowExecutorWithDefaults();

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
        {
          provide: "ConsumerRepo",
          useFactory: () => instance(consumerRepo),
        },
        {
          provide: WorkflowExecutor,
          useFactory: () => instance(workflowExecutor),
        },
        TransactionService,
      ],
    }).compile();

    transactionService = app.get<TransactionService>(TransactionService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // TODO: Skipping as they do not run. Need to add WorkflowExecutor dependencies.
  describe("getTransactionByTransactionRef", () => {
    it("should return the transaction if the debitConsumerID matches", async () => {
      const { transaction } = getRandomTransaction("consumerID");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);

      const returnedTransaction = await transactionService.getTransactionByTransactionRef(
        transaction.transactionRef,
        "consumerID",
      );
      expect(returnedTransaction).toEqual(transaction);
    });

    it("should return the transaction if the creditConsumerID matches", async () => {
      const { transaction } = getRandomTransaction("consumerID");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);

      const returnedTransaction = await transactionService.getTransactionByTransactionRef(
        transaction.transactionRef,
        "consumerID",
      );
      expect(returnedTransaction).toEqual(transaction);
    });

    it("should throw ServiceException if transaction is not found", async () => {
      const { transaction } = getRandomTransaction("consumerID");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(null);

      await expect(
        transactionService.getTransactionByTransactionRef(transaction.transactionRef, "consumerID"),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException if transaction is found but does not belong to specified consumer", async () => {
      const { transaction } = getRandomTransaction("consumerID");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);

      await expect(
        transactionService.getTransactionByTransactionRef(transaction.transactionRef, "anotherConsumerID"),
      ).rejects.toThrowError(ServiceException);
    });
  });

  describe("initiateTransaction", () => {
    it("should initiate a transaction", async () => {
      const consumer = getRandomConsumer("consumerID");
      await consumerRepo.createConsumer(consumer);
      const { transaction, transactionDTO, inputTransaction } = getRandomTransaction(consumer.props.id);
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });
      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(transactionRepo.createTransaction(deepEqual(inputTransaction))).thenResolve(transaction);

      const returnedTransactionRef = await transactionService.initiateTransaction(transactionDTO, consumer, null);
      expect(returnedTransactionRef).toEqual(transaction.transactionRef);
    });
  });
});

const getRandomConsumer = (consumerID: string): Consumer => {
  const email = `${v4()}_${new Date().valueOf()}@noba.com`;
  const props: Partial<ConsumerProps> = {
    id: consumerID,
    firstName: "Noba",
    lastName: "lastName",
    email: email,
    displayEmail: email.toUpperCase(),
    referralCode: Utils.getAlphaNanoID(15),
    phone: `+1${Math.floor(Math.random() * 1000000000)}`,
  };
  return Consumer.createConsumer(props);
};

const getRandomTransaction = (
  consumerID: string,
  consumerID2?: string,
  workflowName: WorkflowName = WorkflowName.DEBIT_CONSUMER_WALLET,
): { transaction: Transaction; transactionDTO: InitiateTransactionDTO; inputTransaction: InputTransaction } => {
  const transaction: Transaction = {
    transactionRef: Utils.generateLowercaseUUID(true),
    exchangeRate: 1,
    status: TransactionStatus.PENDING,
    workflowName: workflowName,
    id: v4(),
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  const transactionDTO: InitiateTransactionDTO = {
    workflowName: transaction.workflowName,
    exchangeRate: transaction.exchangeRate,
  };

  const inputTransaction: InputTransaction = {
    transactionRef: transaction.transactionRef,
    workflowName: transaction.workflowName,
    exchangeRate: transaction.exchangeRate,
  };

  switch (workflowName) {
    case WorkflowName.CONSUMER_WALLET_TRANSFER:
      transaction.debitAmount = 100;
      transaction.debitCurrency = "USD";
      transaction.debitConsumerID = consumerID;
      transaction.creditConsumerID = consumerID2;

      transactionDTO.debitAmount = transaction.debitAmount;
      transactionDTO.debitCurrency = Currency.USD;
      transactionDTO.debitConsumerIDOrTag = transaction.debitConsumerID;
      transactionDTO.creditConsumerIDOrTag = transaction.creditConsumerID;

      inputTransaction.debitAmount = transaction.debitAmount;
      inputTransaction.debitCurrency = transaction.debitCurrency;
      inputTransaction.debitConsumerID = transaction.debitConsumerID;
      inputTransaction.creditConsumerID = transaction.creditConsumerID;
      inputTransaction.creditAmount = transaction.debitAmount;
      inputTransaction.creditCurrency = transaction.debitCurrency;
      break;
    case WorkflowName.DEBIT_CONSUMER_WALLET:
      transaction.debitAmount = 100;
      transaction.debitCurrency = "USD";
      transaction.debitConsumerID = consumerID;

      transactionDTO.debitAmount = transaction.debitAmount;
      transactionDTO.debitCurrency = Currency.USD;
      transactionDTO.debitConsumerIDOrTag = transaction.debitConsumerID;

      inputTransaction.debitAmount = transaction.debitAmount;
      inputTransaction.debitCurrency = transaction.debitCurrency;
      inputTransaction.debitConsumerID = transaction.debitConsumerID;
      inputTransaction.creditAmount = transaction.debitAmount;
      inputTransaction.creditCurrency = transaction.debitCurrency;
      break;
    case WorkflowName.CREDIT_CONSUMER_WALLET:
      transaction.creditAmount = 100;
      transaction.creditCurrency = "USD";
      transaction.creditConsumerID = consumerID;

      transactionDTO.creditAmount = transaction.creditAmount;
      transactionDTO.creditCurrency = Currency.USD;
      transactionDTO.creditConsumerIDOrTag = transaction.creditConsumerID;

      inputTransaction.creditAmount = transaction.creditAmount;
      inputTransaction.creditCurrency = transaction.creditCurrency;
      inputTransaction.creditConsumerID = transaction.creditConsumerID;
      inputTransaction.debitAmount = transaction.creditAmount;
      inputTransaction.debitCurrency = transaction.creditCurrency;
      break;
  }

  return { transaction, transactionDTO, inputTransaction };
};
