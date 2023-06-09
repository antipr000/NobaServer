import { Test, TestingModule } from "@nestjs/testing";
import {
  AppEnvironment,
  COLLECTION_FEE_FIXED_AMOUNT,
  COLLECTION_FEE_MULTIPLIER,
  COLLECTION_NOBA_FEE_AMOUNT,
  DEPOSIT_FEE_FIXED_AMOUNT,
  DEPOSIT_FEE_MULTIPLIER,
  DEPOSIT_NOBA_FEE_AMOUNT,
  NOBA_CONFIG_KEY,
  NOBA_TRANSACTION_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import { WalletDepositMode, WalletDepositTransactionRequest } from "../../../dto/transaction.service.dto";
import { InputTransaction, Transaction, TransactionStatus, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { WalletDepositProcessor } from "../implementations/wallet.deposit.processor";
import { ExchangeRateService } from "../../../../exchangerate/exchangerate.service";
import { anyString, anything, capture, instance, verify, when } from "ts-mockito";
import { getMockExchangeRateServiceWithDefaults } from "../../../../exchangerate/mocks/mock.exchangerate.service";
import { ConsumerService } from "../../../../consumer/consumer.service";
import { AlertService } from "../../../../common/alerts/alert.service";
import { getMockConsumerServiceWithDefaults } from "../../../../consumer/mocks/mock.consumer.service";
import { getMockAlertServiceWithDefaults } from "../../../../common/mocks/mock.alert.service";
import { ServiceErrorCode, ServiceException } from "../../../../../core/exception/service.exception";
import { Consumer } from "../../../../../modules/consumer/domain/Consumer";
import { TransactionFlags } from "../../../../../modules/transaction/domain/TransactionFlags";
import { FeeType } from "../../../../../modules/transaction/domain/TransactionFee";
import { WorkflowExecutor } from "../../../../../infra/temporal/workflow.executor";
import { getMockWorkflowExecutorWithDefaults } from "../../../../../infra/temporal/mocks/mock.workflow.executor";
import { MonoService } from "../../../../../modules/mono/public/mono.service";
import { getMockMonoServiceWithDefaults } from "../../../../../modules/mono/public/mocks/mock.mono.service";
import { MonoCurrency, MonoTransactionType } from "../../../../../modules/mono/domain/Mono";

describe("WalletDepositProcessor", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let walletDepositProcessor: WalletDepositProcessor;
  let exchangeRateService: ExchangeRateService;
  let consumerService: ConsumerService;
  let alertService: AlertService;
  let workflowExecutor: WorkflowExecutor;
  let monoService: MonoService;

  beforeEach(async () => {
    exchangeRateService = getMockExchangeRateServiceWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    alertService = getMockAlertServiceWithDefaults();
    workflowExecutor = getMockWorkflowExecutorWithDefaults();
    monoService = getMockMonoServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        [NOBA_TRANSACTION_CONFIG_KEY]: {
          [DEPOSIT_FEE_FIXED_AMOUNT]: "400", // COP
          [DEPOSIT_FEE_MULTIPLIER]: ".03",
          [DEPOSIT_NOBA_FEE_AMOUNT]: ".50",
          [COLLECTION_FEE_FIXED_AMOUNT]: "500", // COP
          [COLLECTION_FEE_MULTIPLIER]: ".04",
          [COLLECTION_NOBA_FEE_AMOUNT]: ".75",
        },
      },
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: ExchangeRateService,
          useFactory: () => instance(exchangeRateService),
        },
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: AlertService,
          useFactory: () => instance(alertService),
        },
        {
          provide: WorkflowExecutor,
          useFactory: () => instance(workflowExecutor),
        },
        {
          provide: MonoService,
          useFactory: () => instance(monoService),
        },
        WalletDepositProcessor,
      ],
    }).compile();

    walletDepositProcessor = app.get<WalletDepositProcessor>(WalletDepositProcessor);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("validate()", () => {
    const VALID_REQUEST: WalletDepositTransactionRequest = {
      debitAmount: 100,
      debitCurrency: Currency.COP,
      debitConsumerIDOrTag: "DEBIT_CONSUMER_ID",
      memo: "MEMO",
      depositMode: WalletDepositMode.COLLECTION_LINK,
      sessionKey: "SESSION_KEY",
    };

    describe("Static validations", () => {
      it.each(["debitAmount", "debitConsumerIDOrTag", "debitCurrency", "depositMode", "memo", "sessionKey"])(
        "should throw SEMANTIC error if '%s' is not specified",
        async field => {
          const request = JSON.parse(JSON.stringify(VALID_REQUEST));
          delete request[field];

          try {
            await walletDepositProcessor.validate(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        },
      );

      it.each(["depositMode", "debitCurrency"])(
        "should throw SEMANTIC error if '%s' has INVALID value",
        async field => {
          const request = JSON.parse(JSON.stringify(VALID_REQUEST));
          request[field] = "INVALID";

          try {
            await walletDepositProcessor.validate(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        },
      );

      it("should throw SEMANTIC error if debitAmount is less than zero", async () => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request.debitAmount = -1;

        try {
          await walletDepositProcessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining("debitAmount"));
        }
      });

      it("should throw SEMANTIC error if debitCurrency is not COP", async () => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request.debitCurrency = Currency.USD;

        try {
          await walletDepositProcessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining("debitCurrency"));
        }
      });

      it("should throw SEMANTIC error if the depositMode is not COLLECTION_LINK", async () => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request.depositMode = "DEPOSIT";

        try {
          await walletDepositProcessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining("depositMode"));
        }
      });
    });

    describe("Dynamic validations", () => {
      it("should throw SEMANTIC error if the debitConsumerIDOrTag is not found", async () => {
        when(consumerService.getActiveConsumer(VALID_REQUEST.debitConsumerIDOrTag)).thenResolve(null);

        try {
          await walletDepositProcessor.validate(VALID_REQUEST);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining("debitConsumerIDOrTag"));
        }
      });

      it("should throw SEMANTIC error if the postExchangeAmountWithBankFees amount is negative", async () => {
        const consumer: Consumer = Consumer.createConsumer({
          id: "1111111111",
          firstName: "Rosie",
          lastName: "Noba",
          handle: "DEBIT_CONSUMER_ID_OR_TAG",
          email: "rosie@noba.com",
          gender: "Male",
          phone: "+1234567890",
          referralCode: "rosie-referral-code",
          referredByID: "referred-by-1",
          address: {
            countryCode: "US",
          },
        });
        when(consumerService.getActiveConsumer(VALID_REQUEST.debitConsumerIDOrTag)).thenResolve(consumer);
        when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve({
          bankRate: 0.00021,
          numeratorCurrency: Currency.COP,
          denominatorCurrency: Currency.USD,
          expirationTimestamp: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hrs
          nobaRate: 0.00025,
        });

        try {
          await walletDepositProcessor.validate(VALID_REQUEST);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining("AMOUNT_TOO_LOW"));
        }
      });
    });
  });

  describe("getQuote()", () => {
    const exchangeRate = {
      bankRate: 0.00021,
      numeratorCurrency: Currency.COP,
      denominatorCurrency: Currency.USD,
      expirationTimestamp: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hrs
      nobaRate: 0.00025,
    };

    it("should get a quote for a collection", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve(exchangeRate);

      const quote = await walletDepositProcessor.getQuote(100000, Currency.COP, Currency.USD, [
        TransactionFlags.IS_COLLECTION,
      ]);

      expect(quote).toEqual({
        nobaFee: "0.75",
        processingFee: "0.95",
        totalFee: "1.70",
        quoteAmount: "25.00",
        quoteAmountWithFees: "23.30",
        nobaRate: "0.00025",
      });
    });

    it("should get a quote for a non-collection", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve(exchangeRate);

      const quote = await walletDepositProcessor.getQuote(100000, Currency.COP, Currency.USD, []);

      expect(quote).toEqual({
        nobaFee: "0.50",
        processingFee: "0.75",
        totalFee: "1.25",
        quoteAmount: "25.00",
        quoteAmountWithFees: "23.75",
        nobaRate: "0.00025",
      });
    });

    it("should throw ServiceException if the amount is too low (after fees you'd get a negative amount)", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve(exchangeRate);
      expect(async () => {
        await walletDepositProcessor.getQuote(1, Currency.COP, Currency.USD);
      }).rejects.toThrow("AMOUNT_TOO_LOW");
    });

    it("should throw a ServiceException if exchange rate is undefined", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve(null);
      expect(async () => {
        await walletDepositProcessor.getQuote(100, Currency.COP, Currency.USD);
      }).rejects.toThrow(ServiceException);
    });

    it("should throw a ServiceException if the desired currency is not USD", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.USD, Currency.COP)).thenResolve(exchangeRate);
      expect(async () => {
        await walletDepositProcessor.getQuote(100, Currency.USD, Currency.COP);
      }).rejects.toThrow(ServiceException);
    });
  });

  describe("convertToRepoInputTransaction()", () => {
    it("should correctly map the WALLET_DEPOSIT transaction to InputTransaction", async () => {
      const request: WalletDepositTransactionRequest = {
        debitAmount: 100000,
        debitCurrency: Currency.COP,
        debitConsumerIDOrTag: "DEBIT_CONSUMER_ID_OR_TAG",
        memo: "MEMO",
        depositMode: WalletDepositMode.COLLECTION_LINK,
        sessionKey: "SESSION_KEY",
      };

      const consumer: Consumer = Consumer.createConsumer({
        id: "1111111111",
        firstName: "Rosie",
        lastName: "Noba",
        handle: "DEBIT_CONSUMER_ID_OR_TAG",
        email: "rosie@noba.com",
        gender: "Male",
        phone: "+1234567890",
        referralCode: "rosie-referral-code",
        referredByID: "referred-by-1",
        address: {
          countryCode: "US",
        },
      });
      when(consumerService.getActiveConsumer(request.debitConsumerIDOrTag)).thenResolve(consumer);

      const exchangeRate = {
        bankRate: 0.00021,
        numeratorCurrency: Currency.COP,
        denominatorCurrency: Currency.USD,
        expirationTimestamp: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hrs
        nobaRate: 0.00025,
      };
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve(exchangeRate);

      const inputTransaction: InputTransaction = await walletDepositProcessor.convertToRepoInputTransaction(request);

      expect(inputTransaction).toStrictEqual({
        workflowName: WorkflowName.WALLET_DEPOSIT,
        exchangeRate: 0.00025,
        memo: "MEMO",
        transactionRef: expect.any(String),
        transactionFees: [
          {
            amount: 0.75,
            currency: Currency.USD,
            type: FeeType.NOBA,
          },
          {
            amount: 0.95,
            currency: Currency.USD,
            type: FeeType.PROCESSING,
          },
        ],
        sessionKey: request.sessionKey,
        creditAmount: 23.3,
        creditCurrency: Currency.USD,
        debitAmount: 100000,
        debitCurrency: Currency.COP,
        debitConsumerID: "1111111111",
      });
    });
  });

  describe("initiateWorkflow()", () => {
    it("should initiate a WALLET_DEPOSIT workflow", async () => {
      when(workflowExecutor.executeWalletDepositWorkflow(anyString(), anyString())).thenResolve();

      await walletDepositProcessor.initiateWorkflow("TRANSACTION_ID", "TRANSACTION_REF");

      verify(workflowExecutor.executeWalletDepositWorkflow("TRANSACTION_ID", "TRANSACTION_REF")).once();
    });
  });

  describe("performPostProcessing", () => {
    it("should successfully create Mono Transaction", async () => {
      const request: WalletDepositTransactionRequest = {
        debitAmount: 100,
        debitCurrency: Currency.COP,
        debitConsumerIDOrTag: "DEBIT_CONSUMER_ID",
        memo: "MEMO",
        depositMode: WalletDepositMode.COLLECTION_LINK,
        sessionKey: "SESSION_KEY",
      };
      const transaction: Transaction = {
        id: "TRANSACTION_ID",
        workflowName: WorkflowName.WALLET_DEPOSIT,
        exchangeRate: 0.00025,
        memo: "MEMO",
        sessionKey: "SESSION_KEY",
        status: TransactionStatus.INITIATED,
        transactionRef: "TRANSACTION_REF",
        transactionFees: [],
        debitAmount: 100,
        debitCurrency: Currency.COP,
        debitConsumerID: "DEBIT_CONSUMER_ID",
      };
      when(monoService.createMonoTransaction(anything())).thenResolve();

      await walletDepositProcessor.performPostProcessing(request, transaction);

      const [monoCreateTransactionRequest] = capture(monoService.createMonoTransaction).last();
      expect(monoCreateTransactionRequest).toStrictEqual({
        type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
        amount: 100,
        currency: MonoCurrency.COP,
        consumerID: "DEBIT_CONSUMER_ID",
        nobaTransactionID: "TRANSACTION_ID",
      });
    });
  });
});
