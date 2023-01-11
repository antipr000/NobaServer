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
import { getMockWorkflowExecutorWithDefaults } from "../../../infra/temporal/mocks/mock.workflow.executor";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { Utils } from "../../../core/utils/Utils";
import { ServiceException } from "../../../core/exception/ServiceException";
import { ExchangeRateService } from "../../../modules/common/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../../../modules/common/mocks/mock.exchangerate.service";

describe("TransactionServiceTests", () => {
  jest.setTimeout(20000);

  let transactionRepo: ITransactionRepo;
  let app: TestingModule;
  let transactionService: TransactionService;
  let consumerService: ConsumerService;
  let workflowExecutor: WorkflowExecutor;
  let exchangeRateService: ExchangeRateService;

  beforeAll(async () => {
    transactionRepo = getMockTransactionRepoWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    workflowExecutor = getMockWorkflowExecutorWithDefaults();
    exchangeRateService = getMockExchangeRateServiceWithDefaults();

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
          provide: WorkflowExecutor,
          useFactory: () => instance(workflowExecutor),
        },
        {
          provide: ExchangeRateService,
          useFactory: () => instance(exchangeRateService),
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
    it("should initiate a DEBIT_CONSUMER_WALLET transaction", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transaction, transactionDTO, inputTransaction } = getRandomTransaction(
        consumer.props.id,
        null,
        WorkflowName.DEBIT_CONSUMER_WALLET,
      );
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });
      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(transactionRepo.createTransaction(deepEqual(inputTransaction))).thenResolve(transaction);
      when(
        workflowExecutor.executeDebitConsumerWalletWorkflow(
          transaction.debitConsumerID,
          transaction.debitAmount,
          transaction.transactionRef,
        ),
      ).thenResolve(transaction.transactionRef);

      const returnedTransactionRef = await transactionService.initiateTransaction(
        transactionDTO,
        consumer.props.id,
        transaction.sessionKey,
      );

      expect(returnedTransactionRef).toEqual(transaction.transactionRef);
    });

    it("should initiate a CREDIT_CONSUMER_WALLET transaction", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transaction, transactionDTO, inputTransaction } = getRandomTransaction(
        consumer.props.id,
        null,
        WorkflowName.CREDIT_CONSUMER_WALLET,
      );
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });
      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(transactionRepo.createTransaction(deepEqual(inputTransaction))).thenResolve(transaction);
      when(
        workflowExecutor.executeCreditConsumerWalletWorkflow(
          transaction.creditConsumerID,
          transaction.creditAmount,
          transaction.transactionRef,
        ),
      ).thenResolve(transaction.transactionRef);

      const returnedTransactionRef = await transactionService.initiateTransaction(
        transactionDTO,
        consumer.props.id,
        transaction.sessionKey,
      );

      expect(returnedTransactionRef).toEqual(transaction.transactionRef);
    });

    it("should initiate a CONSUMER_WALLET_TRANSFER transaction", async () => {
      const consumer = getRandomConsumer("consumerID");
      const consumer2 = getRandomConsumer("consumerID2");
      const { transaction, transactionDTO, inputTransaction } = getRandomTransaction(
        consumer.props.id,
        consumer2.props.id,
        WorkflowName.CONSUMER_WALLET_TRANSFER,
      );
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });
      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(consumerService.findConsumerById(consumer2.props.id)).thenResolve(consumer2);
      when(transactionRepo.createTransaction(deepEqual(inputTransaction))).thenResolve(transaction);
      when(
        workflowExecutor.executeConsumerWalletTransferWorkflow(
          transaction.debitConsumerID,
          transaction.creditConsumerID,
          transaction.debitAmount,
          transaction.transactionRef,
        ),
      ).thenResolve(transaction.transactionRef);

      const returnedTransactionRef = await transactionService.initiateTransaction(
        transactionDTO,
        consumer.props.id,
        transaction.sessionKey,
      );

      expect(returnedTransactionRef).toEqual(transaction.transactionRef);
    });

    it("should throw ServiceException if consumer is not found", async () => {
      const { transactionDTO } = getRandomTransaction("");
      await expect(transactionService.initiateTransaction(transactionDTO, "", null)).rejects.toThrowError(
        ServiceException,
      );
    });

    it("should throw ServiceException if transaction workflowName is not correct", async () => {
      const consumer = getRandomConsumer("consumerID");

      await expect(
        transactionService.initiateTransaction({ workflowName: null }, consumer.props.id, null),
      ).rejects.toThrowError(ServiceException);
    });

    const creditCases = ["creditConsumerIDOrTag", "creditAmount", "creditCurrency"];
    test.each(creditCases)(
      "should throw ServiceException if credit field: %s is set for DEBIT_CONSUMER_WALLET",
      async creditCase => {
        const consumer = getRandomConsumer("consumerID");
        const { transactionDTO } = getRandomTransaction(consumer.props.id);
        transactionDTO[creditCase] = "someValue";
        await expect(
          transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
        ).rejects.toThrowError(ServiceException);
      },
    );

    const debitCases = ["debitConsumerIDOrTag", "debitAmount", "debitCurrency"];
    test.each(debitCases)(
      "should throw ServiceException if debit field: %s is set for CREDIT_CONSUMER_WALLET",
      async debitCase => {
        const consumer = getRandomConsumer("consumerID");
        const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.CREDIT_CONSUMER_WALLET);
        transactionDTO[debitCase] = "someValue";
        await expect(
          transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
        ).rejects.toThrowError(ServiceException);
      },
    );

    const transferCases = ["debitConsumerIDOrTag", "creditAmount", "creditCurrency"];
    test.each(transferCases)(
      "should throw ServiceException if debit field: %s is set for CONSUMER_WALLET_TRANSFER",
      async transferCase => {
        const consumer = getRandomConsumer("consumerID");
        const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.CONSUMER_WALLET_TRANSFER);
        transactionDTO[transferCase] = "someValue";
        await expect(
          transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
        ).rejects.toThrowError(ServiceException);
      },
    );

    it("should throw ServiceException if debitAmount is less than 0 for DEBIT_CONSUMER_WALLET", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.DEBIT_CONSUMER_WALLET);
      transactionDTO.debitAmount = -1;
      await expect(
        transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException if creditAmount is less than 0 for CREDIT_CONSUMER_WALLET", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.CREDIT_CONSUMER_WALLET);
      transactionDTO.creditAmount = -1;
      await expect(
        transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException if debitAmount is less than 0 for CONSUMER_WALLET_TRANSFER", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.CONSUMER_WALLET_TRANSFER);
      transactionDTO.debitAmount = -1;
      await expect(
        transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException if debitCurrency is not set for DEBIT_CONSUMER_WALLET", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.DEBIT_CONSUMER_WALLET);
      transactionDTO.debitCurrency = null;
      await expect(
        transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException if creditCurrency is not set for CREDIT_CONSUMER_WALLET", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.CREDIT_CONSUMER_WALLET);
      transactionDTO.creditCurrency = null;
      await expect(
        transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException if debitCurrency is not set for CONSUMER_WALLET_TRANSFER", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.CONSUMER_WALLET_TRANSFER);
      transactionDTO.debitCurrency = null;
      await expect(
        transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException if debit consumerID not found", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.DEBIT_CONSUMER_WALLET);
      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(null);

      await expect(
        transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException if debit consumerTag not found", async () => {
      const consumer = getRandomConsumer("$consumerTag");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.DEBIT_CONSUMER_WALLET);
      when(consumerService.findConsumerIDByHandle(consumer.props.id)).thenResolve(null);

      await expect(
        transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException if credit consumerID not found", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.CREDIT_CONSUMER_WALLET);
      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(null);

      await expect(
        transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException if credit consumerTag not found", async () => {
      const consumer = getRandomConsumer("$consumerTag");
      const { transactionDTO } = getRandomTransaction(consumer.props.id, null, WorkflowName.CREDIT_CONSUMER_WALLET);
      when(consumerService.findConsumerIDByHandle(consumer.props.id)).thenResolve(null);

      await expect(
        transactionService.initiateTransaction(transactionDTO, consumer.props.id, null),
      ).rejects.toThrowError(ServiceException);
    });
  });

  describe("calculateExchangeRate", () => {
    it("should return proper exchange rate calculations for conversion from USD to COP", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve({
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 0.0002,
        nobaRate: 0.0002,
      });
      const quote = await transactionService.calculateExchangeRate(1, Currency.USD, Currency.COP);
      expect(quote.exchangeRate).toEqual("0.0002");
      expect(quote.quoteAmount).toEqual("5000.00");
      // 5000 - 1.19 * (0.0265 * 5000 + 900) = 3771.325
      expect(quote.quoteAmountWithFees).toBe("3771.33");
    });

    it("should return proper exchange rate calculations for conversion from COP to USD", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair("COP", "USD")).thenResolve({
        numeratorCurrency: "COP",
        denominatorCurrency: "USD",
        bankRate: 5000,
        nobaRate: 5000,
      });

      const quote = await transactionService.calculateExchangeRate(5000, Currency.COP, Currency.USD);

      expect(quote.exchangeRate).toEqual("5000");
      expect(quote.quoteAmount).toEqual("1.00");
      // 3771.325 COP = 0.754265 USD
      expect(quote.quoteAmountWithFees).toBe("0.75");
    });

    it("should throw ServiceException when base currency is not supported", async () => {
      expect(
        async () => await transactionService.calculateExchangeRate(5000, "INR" as any, Currency.USD),
      ).rejects.toThrow(ServiceException);
    });

    it("should throw ServiceException when desired currency is not supported", async () => {
      expect(
        async () => await transactionService.calculateExchangeRate(5000, Currency.USD, "INR" as any),
      ).rejects.toThrow(ServiceException);
    });

    it("should throw ServiceException when exchange rate is not found", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair("COP", "USD")).thenResolve(null);
      expect(
        async () => await transactionService.calculateExchangeRate(5000, Currency.COP, Currency.USD),
      ).rejects.toThrow(ServiceException);
    });
  });

  describe("calculateExchangeRate", () => {
    it("should return proper exchange rate calculations for conversion from USD to COP", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair("USD", "COP")).thenResolve({
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 0.0002,
        nobaRate: 0.0002,
      });
      const quote = await transactionService.calculateExchangeRate(1, Currency.USD, Currency.COP);
      expect(quote.exchangeRate).toEqual("0.0002");
      expect(quote.quoteAmount).toEqual("5000.00");
      // 5000 - 1.19 * (0.0265 * 5000 + 900) = 3771.325
      expect(quote.quoteAmountWithFees).toBe("3771.33");
    });

    it("should return proper exchange rate calculations for conversion from COP to USD", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair("COP", "USD")).thenResolve({
        numeratorCurrency: "COP",
        denominatorCurrency: "USD",
        bankRate: 5000,
        nobaRate: 5000,
      });

      const quote = await transactionService.calculateExchangeRate(5000, Currency.COP, Currency.USD);

      expect(quote.exchangeRate).toEqual("5000");
      expect(quote.quoteAmount).toEqual("1.00");
      // 3771.325 COP = 0.754265 USD
      expect(quote.quoteAmountWithFees).toBe("0.75");
    });

    it("should throw ServiceException when base currency is not supported", async () => {
      expect(
        async () => await transactionService.calculateExchangeRate(5000, "INR" as any, Currency.USD),
      ).rejects.toThrow(ServiceException);
    });

    it("should throw ServiceException when desired currency is not supported", async () => {
      expect(
        async () => await transactionService.calculateExchangeRate(5000, Currency.USD, "INR" as any),
      ).rejects.toThrow(ServiceException);
    });

    it("should throw ServiceException when exchange rate is not found", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair("COP", "USD")).thenResolve(null);
      expect(
        async () => await transactionService.calculateExchangeRate(5000, Currency.COP, Currency.USD),
      ).rejects.toThrow(ServiceException);
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
    sessionKey: v4(),
    memo: "New transaction",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  const transactionDTO: InitiateTransactionDTO = {
    workflowName: transaction.workflowName,
    exchangeRate: transaction.exchangeRate,
    memo: transaction.memo,
  };

  const inputTransaction: InputTransaction = {
    transactionRef: transaction.transactionRef,
    workflowName: transaction.workflowName,
    exchangeRate: transaction.exchangeRate,
    memo: transaction.memo,
    sessionKey: transaction.sessionKey,
  };

  switch (workflowName) {
    case WorkflowName.CONSUMER_WALLET_TRANSFER:
      transaction.debitAmount = 100;
      transaction.debitCurrency = "USD";
      transaction.debitConsumerID = consumerID;
      transaction.creditConsumerID = consumerID2;

      transactionDTO.debitAmount = transaction.debitAmount;
      transactionDTO.debitCurrency = Currency.USD;
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
