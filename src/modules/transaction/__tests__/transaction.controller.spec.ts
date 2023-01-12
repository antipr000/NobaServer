import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { deepEqual, instance, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";
import { TransactionController } from "../transaction.controller";
import { getMockTransactionServiceWithDefaults } from "../mocks/mock.transaction.service";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { TransactionDTO } from "../dto/TransactionDTO";
import { Utils } from "../../../core/utils/Utils";
import { TransactionFilterOptionsDTO } from "../dto/TransactionFilterOptionsDTO";
import { NotFoundException } from "@nestjs/common";
import { Currency } from "../domain/TransactionTypes";
import { LimitsService } from "../limits.service";
import { getMockLimitsServiceWithDefaults } from "../mocks/mock.limits.service";
import { QuoteRequestDTO } from "../dto/QuoteRequestDTO";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/ServiceException";
import { IncludeEventTypes, TransactionEventDTO } from "../dto/TransactionEventDTO";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { TRANSACTION_MAPPING_SERVICE_PROVIDER } from "../mapper/transaction.mapper.module";
import { TransactionMappingService } from "../mapper/transaction.mapper.service";
import { TransactionEvent } from "../domain/TransactionEvent";

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

const getRandomConsumer = (consumerID: string): Consumer => {
  const email = `${uuid()}_${new Date().valueOf()}@noba.com`;
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

describe("Transaction Controller tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let transactionService: TransactionService;
  let transactionController: TransactionController;
  let limitService: LimitsService;
  let consumerService: ConsumerService;

  beforeEach(async () => {
    transactionService = getMockTransactionServiceWithDefaults();
    limitService = getMockLimitsServiceWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: TRANSACTION_MAPPING_SERVICE_PROVIDER,
          useClass: TransactionMappingService,
        },
        {
          provide: TransactionService,
          useFactory: () => instance(transactionService),
        },
        {
          provide: LimitsService,
          useFactory: () => instance(limitService),
        },
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        TransactionController,
      ],
    }).compile();

    transactionController = app.get<TransactionController>(TransactionController);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("getTransaction", () => {
    it("should return the transaction after resolving debit consumer id to tag", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      when(transactionService.getTransactionByTransactionRef(transactionRef, consumerID)).thenResolve(transaction);

      const result: TransactionDTO = await transactionController.getTransaction(
        IncludeEventTypes.NONE,
        transactionRef,
        consumer,
      );
      const expectedResult: TransactionDTO = {
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        creditConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: undefined,
      };

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return the transaction after resolving credit consumer id to tag", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID, true);
      when(transactionService.getTransactionByTransactionRef(transactionRef, consumerID)).thenResolve(transaction);

      const result: TransactionDTO = await transactionController.getTransaction(
        IncludeEventTypes.NONE,
        transactionRef,
        consumer,
      );
      const expectedResult: TransactionDTO = {
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        creditConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        debitConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: undefined,
      };

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return a transfer transaction after resolving both credit and debit consumer IDs to tags", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const creditConsumer = getRandomConsumer("creditConsumerID");
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      transaction.creditConsumerID = creditConsumer.props.id;

      when(transactionService.getTransactionByTransactionRef(transactionRef, consumerID)).thenResolve(transaction);
      when(consumerService.getConsumer(creditConsumer.props.id)).thenResolve(creditConsumer);

      const result: TransactionDTO = await transactionController.getTransaction(
        IncludeEventTypes.NONE,
        transactionRef,
        consumer,
      );
      const expectedResult: TransactionDTO = {
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        creditConsumer: {
          id: creditConsumer.props.id,
          firstName: creditConsumer.props.firstName,
          handle: creditConsumer.props.handle,
          lastName: creditConsumer.props.lastName,
        },
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: undefined,
      };

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return transaction without resolving consumer id to tag", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      when(transactionService.getTransactionByTransactionRef(transactionRef, consumerID)).thenResolve(transaction);

      const result: TransactionDTO = await transactionController.getTransaction(
        IncludeEventTypes.NONE,
        transactionRef,
        consumer,
      );
      const expectedResult: TransactionDTO = {
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        creditConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: undefined,
      };

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return the transaction with events", async () => {
      const consumerID = "testConsumerID";
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      const consumer = getRandomConsumer(consumerID);
      when(transactionService.getTransactionByTransactionRef(transactionRef, consumerID)).thenResolve(transaction);

      const transactionEvents: TransactionEvent[] = [
        {
          id: "testEventID",
          timestamp: new Date(),
          transactionID: transaction.id,
          message: "Test event",
          details: "This is a test event",
          internal: false,
          key: "EVENT_KEY",
          param1: "Param 1",
          param2: "Param 2",
          param3: "Param 3",
          param4: "Param 4",
          param5: "Param 5",
        },
        {
          id: "testEvent2ID",
          timestamp: new Date(),
          transactionID: transaction.id,
          message: "Test event 2",
          details: "This is a test event 2",
          internal: false,
          key: "EVENT_KEY_2",
          param1: "Param 1",
          param2: "Param 2",
          param3: "Param 3",
          param4: "Param 4",
          param5: "Param 5",
        },
      ];

      const transactionEventsToReturn: TransactionEventDTO[] = [
        {
          message: "Test event",
          details: "This is a test event",
          internal: false,
          key: "EVENT_KEY",
          parameters: ["Param 1", "Param 2", "Param 3", "Param 4", "Param 5"],
          timestamp: transactionEvents[0].timestamp,
        },
        {
          message: "Test event 2",
          details: "This is a test event 2",
          internal: false,
          key: "EVENT_KEY_2",
          parameters: ["Param 1", "Param 2", "Param 3", "Param 4", "Param 5"],
          timestamp: transactionEvents[1].timestamp,
        },
      ];

      when(transactionService.getTransactionEvents(transaction.id, true)).thenResolve(transactionEvents);

      const result: TransactionDTO = await transactionController.getTransaction(
        IncludeEventTypes.ALL,
        transactionRef,
        consumer,
      );

      const expectedResult: TransactionDTO = {
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        creditConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: transactionEventsToReturn,
      };

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return empty events array if events requested but none exist", async () => {
      const consumerID = "testConsumerID";
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      const consumer = getRandomConsumer(consumerID);
      when(transactionService.getTransactionByTransactionRef(transactionRef, consumerID)).thenResolve(transaction);
      when(transactionService.getTransactionEvents(transaction.id, true)).thenResolve([]);

      const result: TransactionDTO = await transactionController.getTransaction(
        IncludeEventTypes.ALL,
        transactionRef,
        consumer,
      );

      const expectedResult: TransactionDTO = {
        transactionRef: transaction.transactionRef,
        workflowName: transaction.workflowName,
        debitConsumer: {
          id: consumer.props.id,
          firstName: consumer.props.firstName,
          handle: consumer.props.handle,
          lastName: consumer.props.lastName,
        },
        creditConsumer: null,
        debitCurrency: transaction.debitCurrency,
        creditCurrency: transaction.creditCurrency,
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        exchangeRate: transaction.exchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: transaction.memo,
        transactionEvents: [],
      };

      expect(result).toStrictEqual(expectedResult);
    });

    it("should throw NotFoundException when transaction is not found", async () => {
      const consumerID = "testConsumerID";
      const transactionRef = "transactionRef";
      when(transactionService.getTransactionByTransactionRef(transactionRef, consumerID)).thenResolve(null);

      expect(
        async () =>
          await transactionController.getTransaction(
            IncludeEventTypes.NONE,
            transactionRef,
            getRandomConsumer(consumerID),
          ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAllTransactions", () => {
    it("should get filtered transactions with resolved tags", async () => {
      const consumerID = "testConsumerID";
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      const consumer = getRandomConsumer(consumerID);
      transaction.transactionRef = transactionRef;
      transaction.status = TransactionStatus.SUCCESS;

      const filter: TransactionFilterOptionsDTO = {
        consumerID: consumerID,
        transactionStatus: TransactionStatus.SUCCESS,
        pageLimit: 5,
        pageOffset: 1,
      };
      when(transactionService.getFilteredTransactions(deepEqual(filter))).thenResolve({
        items: [transaction],
        page: 1,
        hasNextPage: false,
        totalPages: 1,
        totalItems: 1,
      });

      const allTransactions = await transactionController.getAllTransactions(
        {
          transactionStatus: TransactionStatus.SUCCESS,
          pageLimit: 5,
          pageOffset: 1,
        },
        consumer,
      );

      expect(allTransactions.items.length).toBe(1);
      expect(allTransactions.items[0].transactionRef).toBe(transactionRef);
      expect(allTransactions.items[0].debitConsumer.handle).toBe(consumer.props.handle);
      expect(allTransactions.items[0].creditConsumer).toBeNull();
    });
  });

  describe("initiateTransaction", () => {
    it("should return transaction id of the initiated transaction if all parameters are correct", async () => {
      const orderDetails = {
        debitConsumerIDOrTag: "$soham",
        workflowName: WorkflowName.CREDIT_CONSUMER_WALLET,
        debitCurrency: Currency.COP,
        debitAmount: 100,
      };

      const consumerID = "fakeConsumerID";
      const consumer = getRandomConsumer(consumerID);

      when(transactionService.initiateTransaction(deepEqual(orderDetails), consumerID, "fake-session")).thenResolve(
        "fake-transaction-id",
      );

      const response = await transactionController.initiateTransaction("fake-session", orderDetails, consumer);

      expect(response).toBe("fake-transaction-id");
    });
  });

  describe("getQuote", () => {
    it("should return quote if all parameters are correct", async () => {
      const quoteDetails: QuoteRequestDTO = {
        amount: 1,
        currency: Currency.USD,
        desiredCurrency: Currency.COP,
      };

      when(transactionService.calculateExchangeRate(1, Currency.USD, Currency.COP)).thenResolve({
        exchangeRate: "5000",
        quoteAmount: "5000",
        quoteAmountWithFees: "3775",
      });
      const response = await transactionController.getQuote(quoteDetails);
      expect(response).toStrictEqual({
        exchangeRate: "5000",
        quoteAmount: "5000",
        quoteAmountWithFees: "3775",
      });
    });

    it("should throw ServiceException if exchange rate is not available", async () => {
      const quoteDetails: QuoteRequestDTO = {
        amount: 1,
        currency: Currency.USD,
        desiredCurrency: Currency.COP,
      };

      when(transactionService.calculateExchangeRate(1, Currency.USD, Currency.COP)).thenReject(
        new ServiceException({
          errorCode: ServiceErrorCode.DOES_NOT_EXIST,
          message: "Exchange rate not available",
        }),
      );

      await expect(transactionController.getQuote(quoteDetails)).rejects.toThrow(ServiceException);
    });
  });
});
