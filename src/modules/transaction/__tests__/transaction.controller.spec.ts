import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { uuid } from "uuidv4";
import { Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { anything, deepEqual, instance, when } from "ts-mockito";
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
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { IncludeEventTypes, TransactionEventDTO } from "../dto/TransactionEventDTO";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { TRANSACTION_MAPPING_SERVICE_PROVIDER, TransactionMappingService } from "../mapper/transaction.mapper.service";
import { TransactionEvent } from "../domain/TransactionEvent";
import { MonoService } from "../../mono/public/mono.service";
import { getMockMonoServiceWithDefaults } from "../../mono/public/mocks/mock.mono.service";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { AccountType, DocumentType } from "../domain/WithdrawalDetails";
import { TransactionFlags } from "../domain/TransactionFlags";
import { MonoTransaction, MonoTransactionState, MonoTransactionType } from "../../mono/domain/Mono";
import { FeeType } from "../domain/TransactionFee";

const getRandomTransaction = (consumerID: string, isCreditTransaction = false): Transaction => {
  const transaction: Transaction = {
    transactionRef: uuid(),
    exchangeRate: 1,
    status: TransactionStatus.INITIATED,
    workflowName: WorkflowName.WALLET_DEPOSIT,
    id: uuid(),
    sessionKey: uuid(),
    memo: "New transaction",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    transactionFees: [
      {
        amount: 10,
        currency: "USD",
        type: FeeType.NOBA,
        id: uuid(),
        timestamp: new Date(),
      },
    ],
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

// TODO: Add separate test layer for mapper services (maybe)?

describe("Transaction Controller tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let transactionService: TransactionService;
  let transactionController: TransactionController;
  let limitService: LimitsService;
  let monoService: MonoService;
  let consumerService: ConsumerService;

  beforeEach(async () => {
    transactionService = getMockTransactionServiceWithDefaults();
    limitService = getMockLimitsServiceWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    monoService = getMockMonoServiceWithDefaults();

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
        {
          provide: MonoService,
          useFactory: () => instance(monoService),
        },
        TransactionController,
      ],
    }).compile();

    when(monoService.getTransactionByNobaTransactionID(anything())).thenResolve(null);
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
        id: transaction.id,
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
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
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
        id: transaction.id,
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
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
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
        id: transaction.id,
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
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
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
        id: transaction.id,
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
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      };

      expect(result).toStrictEqual(expectedResult);
    });

    it("should return transaction with paymentCollectionLink for WALLET_DEPOSIT", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const transactionRef = "transactionRef";
      const transaction: Transaction = getRandomTransaction(consumerID);
      when(transactionService.getTransactionByTransactionRef(transactionRef, consumerID)).thenResolve(transaction);

      const monoTransaction: MonoTransaction = {
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        id: "monoTransactionID",
        nobaTransactionID: transaction.id,
        state: MonoTransactionState.SUCCESS,
        type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        collectionLinkDepositDetails: {
          collectionURL: "collectionURL",
          collectionLinkID: "collectionLinkID",
        },
      };

      when(monoService.getTransactionByNobaTransactionID(anything())).thenResolve(monoTransaction);

      const result: TransactionDTO = await transactionController.getTransaction(
        IncludeEventTypes.NONE,
        transactionRef,
        consumer,
      );
      const expectedResult: TransactionDTO = {
        id: transaction.id,
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
        paymentCollectionLink: monoTransaction.collectionLinkDepositDetails.collectionURL,
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
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
          text: "",
          timestamp: transactionEvents[0].timestamp,
        },
        {
          message: "Test event 2",
          details: "This is a test event 2",
          internal: false,
          text: "",
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
        id: transaction.id,
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
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
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
        id: transaction.id,
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
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
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
      transaction.status = TransactionStatus.COMPLETED;

      const filter: TransactionFilterOptionsDTO = {
        consumerID: consumerID,
        transactionStatus: TransactionStatus.COMPLETED,
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
          transactionStatus: TransactionStatus.COMPLETED,
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
    it("should return transaction of the initiated transaction if all parameters are correct", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const creditConsumer = getRandomConsumer("creditConsumerID");
      const transaction: Transaction = getRandomTransaction(consumerID);
      transaction.creditConsumerID = creditConsumer.props.id;

      when(consumerService.getConsumer(creditConsumer.props.id)).thenResolve(creditConsumer);

      const expectedResult: TransactionDTO = {
        id: transaction.id,
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
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      };

      const orderDetails = {
        debitConsumerIDOrTag: "$soham",
        workflowName: WorkflowName.WALLET_DEPOSIT,
        debitCurrency: Currency.COP,
        debitAmount: 100,
      };

      when(
        transactionService.deprecatedInitiateTransaction(deepEqual(orderDetails), consumerID, "fake-session"),
      ).thenResolve(transaction);

      const response = await transactionController.initiateTransaction("fake-session", orderDetails, consumer);

      expect(response).toStrictEqual(expectedResult);
    });

    it("should return transaction of the initiated transaction if all parameters(and optional) are correct", async () => {
      const consumerID = "testConsumerID";
      const consumer = getRandomConsumer(consumerID);
      const testMemo = "testing this memo.";
      const testExchangeRate = 5000;
      const creditConsumer = getRandomConsumer("creditConsumerID");
      const transaction: Transaction = getRandomTransaction(consumerID);
      transaction.creditConsumerID = creditConsumer.props.id;
      transaction.memo = testMemo;
      transaction.exchangeRate = testExchangeRate;

      when(consumerService.getConsumer(creditConsumer.props.id)).thenResolve(creditConsumer);

      const expectedResult: TransactionDTO = {
        id: transaction.id,
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
        exchangeRate: testExchangeRate.toString(),
        status: transaction.status,
        createdTimestamp: transaction.createdTimestamp,
        updatedTimestamp: transaction.updatedTimestamp,
        memo: testMemo,
        transactionEvents: undefined,
        transactionFees: [
          {
            amount: 10,
            currency: "USD",
            type: FeeType.NOBA,
          },
        ],
        totalFees: 10,
      };

      const orderDetails: InitiateTransactionDTO = {
        debitConsumerIDOrTag: "$soham",
        workflowName: WorkflowName.WALLET_DEPOSIT,
        debitCurrency: Currency.COP,
        debitAmount: 100,
        memo: testMemo,
        withdrawalData: {
          accountNumber: "123456789",
          accountType: AccountType.CHECKING,
          bankCode: "123",
          documentNumber: "123456789",
          documentType: DocumentType.CC,
        },
      };

      when(
        transactionService.deprecatedInitiateTransaction(deepEqual(orderDetails), consumerID, "fake-session"),
      ).thenResolve(transaction);

      const response = await transactionController.initiateTransaction("fake-session", orderDetails, consumer);

      expect(response).toStrictEqual(expectedResult);
    });
  });

  describe("getQuote", () => {
    it("should return quote if all parameters are correct", async () => {
      const quoteDetails: QuoteRequestDTO = {
        amount: 5000,
        currency: Currency.COP,
        desiredCurrency: Currency.USD,
        workflowName: WorkflowName.WALLET_DEPOSIT,
        options: [],
      };

      when(
        transactionService.getTransactionQuote(
          quoteDetails.amount,
          quoteDetails.currency,
          quoteDetails.desiredCurrency,
          quoteDetails.workflowName,
          deepEqual(quoteDetails.options),
        ),
      ).thenResolve({
        nobaFee: "1.99",
        processingFee: "0.00",
        totalFee: "1.99",
        quoteAmount: "12.50",
        quoteAmountWithFees: "10.51",
        nobaRate: "0.00025",
      });

      const response = await transactionController.getQuote(quoteDetails);
      expect(response).toStrictEqual({
        nobaFee: "1.99",
        processingFee: "0.00",
        totalFee: "1.99",
        quoteAmount: "12.50",
        quoteAmountWithFees: "10.51",
        nobaRate: "0.00025",
      });
    });

    it("should correctly pass through the exchange rate flags", async () => {
      const quoteDetails: QuoteRequestDTO = {
        amount: 5000,
        currency: Currency.COP,
        desiredCurrency: Currency.USD,
        workflowName: WorkflowName.WALLET_DEPOSIT,
        options: [TransactionFlags.IS_COLLECTION],
      };

      when(
        transactionService.getTransactionQuote(
          quoteDetails.amount,
          quoteDetails.currency,
          quoteDetails.desiredCurrency,
          quoteDetails.workflowName,
          deepEqual(quoteDetails.options),
        ),
      ).thenResolve({
        nobaFee: "1.99",
        processingFee: "0.60",
        totalFee: "2.59",
        quoteAmount: "12.50",
        quoteAmountWithFees: "9.91",
        nobaRate: "0.00025",
      });

      const response = await transactionController.getQuote(quoteDetails);
      expect(response).toStrictEqual({
        nobaFee: "1.99",
        processingFee: "0.60",
        totalFee: "2.59",
        quoteAmount: "12.50",
        quoteAmountWithFees: "9.91",
        nobaRate: "0.00025",
      });
    });

    it("should throw ServiceException if exchange rate is not available", async () => {
      const quoteDetails: QuoteRequestDTO = {
        amount: 5000,
        currency: Currency.COP,
        desiredCurrency: Currency.USD,
        workflowName: WorkflowName.WALLET_DEPOSIT,
        options: [TransactionFlags.IS_COLLECTION],
      };

      when(
        transactionService.getTransactionQuote(
          quoteDetails.amount,
          quoteDetails.currency,
          quoteDetails.desiredCurrency,
          quoteDetails.workflowName,
          deepEqual(quoteDetails.options),
        ),
      ).thenReject(
        new ServiceException({
          errorCode: ServiceErrorCode.DOES_NOT_EXIST,
          message: "Exchange rate not available",
        }),
      );

      await expect(transactionController.getQuote(quoteDetails)).rejects.toThrow(ServiceException);
    });
  });
});
