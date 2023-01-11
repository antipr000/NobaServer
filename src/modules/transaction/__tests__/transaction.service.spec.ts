import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { ITransactionRepo } from "../repo/transaction.repo";
import { getMockTransactionRepoWithDefaults } from "../mocks/mock.sql.transaction.repo";
import { TRANSACTION_REPO_PROVIDER } from "../repo/transaction.repo.module";
import { anyString, anything, deepEqual, instance, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { getMockWorkflowExecutorWithDefaults } from "../../../infra/temporal/mocks/mock.workflow.executor";
import { ExchangeRateService } from "../../../modules/common/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../../../modules/common/mocks/mock.exchangerate.service";
import { Currency } from "../domain/TransactionTypes";
import { ServiceException } from "../../../core/exception/ServiceException";
import { TransactionEventDTO } from "../dto/TransactionEventDTO";
import { InputTransactionEvent, TransactionEvent } from "../domain/TransactionEvent";

const getRandomTransaction = (consumerID: string, isCreditTransaction = false): Transaction => {
  const transaction: Transaction = {
    transactionRef: uuid(),
    exchangeRate: 1,
    status: TransactionStatus.PENDING,
    workflowName: WorkflowName.CREDIT_CONSUMER_WALLET,
    id: uuid(),
    sessionKey: uuid(),
    memo: "New transaction",
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

  describe("getTransactionByTransactionRef", () => {
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

    it("should return null if transaction is not found", async () => {
      const transaction = getRandomTransaction("consumerID");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(null);
      const response = await transactionService.getTransactionByTransactionRef(
        transaction.transactionRef,
        "consumerID",
      );
      expect(response).toBeNull();
    });

    it("should return null if transaction is found 'but' not belong to specified consumer", async () => {
      const transaction = getRandomTransaction("consumerID");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);
      const response = await transactionService.getTransactionByTransactionRef(
        transaction.transactionRef,
        "anotherConsumerID",
      );
      expect(response).toBeNull();
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

  describe("addTransactionEvent", () => {
    it("should add a transaction event for the specified transaction with minimal parameters", async () => {
      const transaction = getRandomTransaction("consumerID", /* isCreditTransaction */ false);
      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);

      const transactionEventToAdd: TransactionEventDTO = {
        message: "Test event",
        internal: true,
      };

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: transaction.id,
        internal: true,
        message: transactionEventToAdd.message,
      };

      when(transactionRepo.addTransactionEvent(deepEqual(inputTransactionEvent))).thenResolve({
        ...inputTransactionEvent,
        id: "event-id",
        timestamp: new Date(),
      });

      const returnedTransactionEvent = await transactionService.addTransactionEvent(
        transaction.id,
        transactionEventToAdd,
      );

      expect(returnedTransactionEvent).toEqual({
        ...transactionEventToAdd,
      });
    });

    it("should add a transaction event for the specified transaction with all parameters", async () => {
      const transaction = getRandomTransaction("consumerID", /* isCreditTransaction */ false);
      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);

      const transactionEventToAdd: TransactionEventDTO = {
        message: "Test event",
        details: "This is a test event",
        internal: false,
        key: "EVENT_KEY",
        parameters: ["Param 1", "Param 2", "Param 3", "Param 4", "Param 5"],
      };

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: transaction.id,
        internal: transactionEventToAdd.internal,
        message: transactionEventToAdd.message,
        details: transactionEventToAdd.details,
        key: transactionEventToAdd.key,
        param1: transactionEventToAdd.parameters[0],
        param2: transactionEventToAdd.parameters[1],
        param3: transactionEventToAdd.parameters[2],
        param4: transactionEventToAdd.parameters[3],
        param5: transactionEventToAdd.parameters[4],
      };

      // TODO: Figure out why deepEqual(inputTransactionEvent) doesn't work here
      when(transactionRepo.addTransactionEvent(anything())).thenResolve({
        ...inputTransactionEvent,
        id: "event-id",
        timestamp: new Date(),
      });

      const returnedTransactionEvent = await transactionService.addTransactionEvent(
        transaction.id,
        transactionEventToAdd,
      );

      expect(returnedTransactionEvent).toEqual({
        ...transactionEventToAdd,
      });
    });

    it("should throw a ServiceException if the transaction doesn't exist", async () => {
      const transactionID = "transaction-1234";
      when(transactionRepo.getTransactionByID(transactionID)).thenResolve(null);

      expect(async () => await transactionService.addTransactionEvent(transactionID, anything())).rejects.toThrow(
        ServiceException,
      );
    });
  });

  describe("getTransactionEvents", () => {
    it("should retrieve transaction events for the specified transaction", async () => {
      const transaction = getRandomTransaction("consumerID", /* isCreditTransaction */ false);
      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);

      const transactionEventToAdd: TransactionEventDTO = {
        message: "Test event",
      };

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: transaction.id,
        message: transactionEventToAdd.message,
      };

      when(transactionRepo.addTransactionEvent(deepEqual(inputTransactionEvent))).thenResolve({
        ...inputTransactionEvent,
        id: "event-id",
        timestamp: new Date(),
      });

      const timestamp = new Date();
      const internalTransactionEvent1: TransactionEvent = {
        id: "event-id-1",
        transactionID: transaction.id,
        timestamp: timestamp,
        message: "Test event internal",
        details: "This is an internal test event",
        internal: true,
        key: "EVENT_KEY_INTERNAL",
        param1: "Param 1",
        param2: "Param 2",
      };

      const internalTransactionEvent2: TransactionEvent = {
        id: "event-id-1-5",
        transactionID: transaction.id,
        timestamp: timestamp,
        message: "Test event internal 2",
        internal: true,
      };

      const externalTransactionEvent: TransactionEvent = {
        id: "event-id-2",
        transactionID: transaction.id,
        timestamp: timestamp,
        message: "Test event external",
        details: "This is an external test event",
        internal: false,
        key: "EVENT_KEY_EXTERNAL",
        param1: "Param 1",
        param2: "Param 2",
        param3: "Param 3",
        param4: "Param 4",
        param5: "Param 5",
      };

      // Include all events
      when(transactionRepo.getTransactionEvents(transaction.id, true)).thenResolve([
        internalTransactionEvent1,
        internalTransactionEvent2,
        externalTransactionEvent,
      ]);

      // Include only external events
      when(transactionRepo.getTransactionEvents(transaction.id, false)).thenResolve([externalTransactionEvent]);

      const returnedAllTransactionEvent = await transactionService.getTransactionEvents(transaction.id, true);
      const returnedExternalTransactionEvent = await transactionService.getTransactionEvents(transaction.id, false);

      const expectedInternalTransactionEvent1: TransactionEventDTO = {
        timestamp: internalTransactionEvent1.timestamp,
        message: internalTransactionEvent1.message,
        details: internalTransactionEvent1.details,
        internal: internalTransactionEvent1.internal,
        key: internalTransactionEvent1.key,
        parameters: [internalTransactionEvent1.param1, internalTransactionEvent1.param2],
      };

      const expectedInternalTransactionEvent2: TransactionEventDTO = {
        timestamp: internalTransactionEvent2.timestamp,
        message: internalTransactionEvent2.message,
        details: internalTransactionEvent2.details,
        internal: internalTransactionEvent2.internal,
      };

      const expectedExternalTransactionEvent: TransactionEventDTO = {
        timestamp: externalTransactionEvent.timestamp,
        message: externalTransactionEvent.message,
        details: externalTransactionEvent.details,
        internal: externalTransactionEvent.internal,
        key: externalTransactionEvent.key,
        parameters: [
          externalTransactionEvent.param1,
          externalTransactionEvent.param2,
          externalTransactionEvent.param3,
          externalTransactionEvent.param4,
          externalTransactionEvent.param5,
        ],
      };

      expect(returnedAllTransactionEvent).toHaveLength(3);
      expect(returnedAllTransactionEvent[0]).toEqual(expectedInternalTransactionEvent1);
      expect(returnedAllTransactionEvent[1]).toEqual(expectedInternalTransactionEvent2);
      expect(returnedAllTransactionEvent[2]).toEqual(expectedExternalTransactionEvent);

      expect(returnedExternalTransactionEvent).toHaveLength(1);
      expect(returnedExternalTransactionEvent[0]).toEqual(expectedExternalTransactionEvent);
    });
  });
});
