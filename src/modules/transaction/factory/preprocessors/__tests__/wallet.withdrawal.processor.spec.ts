import { Test, TestingModule } from "@nestjs/testing";
import {
  NOBA_CONFIG_KEY,
  NOBA_TRANSACTION_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
  WITHDRAWAL_MONO_FEE_AMOUNT,
  WITHDRAWAL_NOBA_FEE_AMOUNT,
} from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import { WalletWithdrawalTransactionRequest } from "../../../dto/transaction.service.dto";
import { InputTransaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { ExchangeRateService } from "../../../../exchangerate/exchangerate.service";
import { instance, when } from "ts-mockito";
import { getMockExchangeRateServiceWithDefaults } from "../../../../exchangerate/mocks/mock.exchangerate.service";
import { ConsumerService } from "../../../../consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../../consumer/mocks/mock.consumer.service";
import { ServiceErrorCode, ServiceException } from "../../../../../core/exception/service.exception";
import { Consumer } from "../../../../../modules/consumer/domain/Consumer";
import { FeeType } from "../../../../../modules/transaction/domain/TransactionFee";
import { WalletWithdrawalProcessor } from "../implementations/wallet.withdrawal.processor";
import { AccountType, DocumentType } from "../../../../../modules/transaction/domain/WithdrawalDetails";

describe("WalletWithdrawalProcessor", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let walletWithdrawalProcessor: WalletWithdrawalProcessor;
  let exchangeRateService: ExchangeRateService;
  let consumerService: ConsumerService;

  beforeEach(async () => {
    exchangeRateService = getMockExchangeRateServiceWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        [NOBA_TRANSACTION_CONFIG_KEY]: {
          [WITHDRAWAL_MONO_FEE_AMOUNT]: 3000, // In COP
          [WITHDRAWAL_NOBA_FEE_AMOUNT]: 1.5, // In USD
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
        WalletWithdrawalProcessor,
      ],
    }).compile();

    walletWithdrawalProcessor = app.get<WalletWithdrawalProcessor>(WalletWithdrawalProcessor);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("validate()", () => {
    const VALID_REQUEST: WalletWithdrawalTransactionRequest = {
      debitAmount: 100000,
      debitConsumerIDOrTag: "DEBIT_CONSUMER_ID_OR_TAG",
      creditCurrency: Currency.COP,
      memo: "MEMO",
      sessionKey: "SESSION_KEY",
      withdrawalDetails: {
        bankCode: "BANCOLOMBIA",
        accountNumber: "1234567890",
        documentNumber: "9876543210",
        accountType: AccountType.CHECKING,
        documentType: DocumentType.CC,
      },
    };

    describe("Static validations", () => {
      it.each(["debitAmount", "debitConsumerIDOrTag", "creditCurrency", "memo", "sessionKey"])(
        "should throw SEMANTIC error if '%s' is not specified",
        async field => {
          const request = JSON.parse(JSON.stringify(VALID_REQUEST));
          delete request[field];

          try {
            await walletWithdrawalProcessor.validate(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        },
      );

      it.each(["creditCurrency"])("should throw SEMANTIC error if '%s' has INVALID value", async field => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request[field] = "INVALID";

        try {
          await walletWithdrawalProcessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }
      });

      it("should throw SEMANTIC error if debitAmount is less than zero", async () => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request.debitAmount = -1;

        try {
          await walletWithdrawalProcessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining("debitAmount"));
        }
      });

      describe("'withdrawalDetails sub-object", () => {
        it.each(["bankCode", "accountNumber", "documentNumber", "accountType", "documentType"])(
          "should throw SEMANTIC error if '%s' is not specified",
          async field => {
            const request = JSON.parse(JSON.stringify(VALID_REQUEST));
            delete request.withdrawalDetails[field];

            try {
              await walletWithdrawalProcessor.validate(request);
              expect(true).toBe(false);
            } catch (err) {
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("withdrawalDetails"));
              expect(err.message).toEqual(expect.stringContaining(`${field}`));
            }
          },
        );

        it.each(["documentType", "accountType"])(
          "should throw SEMANTIC error if '%s' has INVALID value",
          async field => {
            const request = JSON.parse(JSON.stringify(VALID_REQUEST));
            request.withdrawalDetails[field] = "INVALID";

            try {
              await walletWithdrawalProcessor.validate(request);
              expect(true).toBe(false);
            } catch (err) {
              expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
              expect(err.message).toEqual(expect.stringContaining("withdrawalDetails"));
              expect(err.message).toEqual(expect.stringContaining(`${field}`));
            }
          },
        );
      });
    });

    describe("Dynamic validations", () => {
      it("should throw SEMANTIC error if the debitConsumerIDOrTag is not found", async () => {
        when(consumerService.getActiveConsumer(VALID_REQUEST.debitConsumerIDOrTag)).thenResolve(null);

        try {
          await walletWithdrawalProcessor.validate(VALID_REQUEST);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining("debitConsumerIDOrTag"));
        }
      });

      it("should throw SEMANTIC error if the postExchangeAmountWithBankFees amount is negative", async () => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request.debitAmount = 1;

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
        when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.USD, Currency.COP)).thenResolve({
          bankRate: 5000,
          numeratorCurrency: Currency.USD,
          denominatorCurrency: Currency.COP,
          expirationTimestamp: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hrs
          nobaRate: 4000,
        });

        try {
          await walletWithdrawalProcessor.validate(request);
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
      bankRate: 5000,
      numeratorCurrency: Currency.USD,
      denominatorCurrency: Currency.COP,
      expirationTimestamp: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hrs
      nobaRate: 4000,
    };

    it("should get a quote for a valid request", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.USD, Currency.COP)).thenResolve(exchangeRate);
      const quote = await walletWithdrawalProcessor.getQuote(50, Currency.USD, Currency.COP);
      expect(quote).toEqual({
        nobaFee: "1.50",
        processingFee: "0.60",
        totalFee: "2.10",
        quoteAmount: "200000.00",
        quoteAmountWithFees: "191600.00",
        nobaRate: "4000",
      });
    });

    it("should throw ServiceException if the amount is too low (after fees you'd get a negative amount)", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.USD, Currency.COP)).thenResolve(exchangeRate);
      expect(async () => {
        await walletWithdrawalProcessor.getQuote(1, Currency.USD, Currency.COP);
      }).rejects.toThrow("AMOUNT_TOO_LOW");
    });

    it("should throw a ServiceException if exchange rate is undefined", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.USD, Currency.COP)).thenResolve(null);
      expect(async () => {
        await walletWithdrawalProcessor.getQuote(50, Currency.USD, Currency.COP);
      }).rejects.toThrow(ServiceException);
    });

    it("should throw a ServiceException if the desired currency is not COP", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve(exchangeRate);
      expect(async () => {
        await walletWithdrawalProcessor.getQuote(50, Currency.COP, Currency.USD);
      }).rejects.toThrow(ServiceException);
    });
  });

  describe("convertToRepoInputTransaction()", () => {
    it("should correctly map the WALLET_DEPOSIT transaction to InputTransaction", async () => {
      const request: WalletWithdrawalTransactionRequest = {
        debitAmount: 50,
        debitConsumerIDOrTag: "DEBIT_CONSUMER_ID_OR_TAG",
        creditCurrency: Currency.COP,
        memo: "MEMO",
        sessionKey: "SESSION_KEY",
        withdrawalDetails: {
          bankCode: "BANCOLOMBIA",
          accountNumber: "1234567890",
          documentNumber: "9876543210",
          accountType: AccountType.CHECKING,
          documentType: DocumentType.CC,
        },
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
        bankRate: 5000,
        numeratorCurrency: Currency.USD,
        denominatorCurrency: Currency.COP,
        expirationTimestamp: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hrs
        nobaRate: 4000,
      };
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.USD, Currency.COP)).thenResolve(exchangeRate);

      const inputTransaction: InputTransaction = await walletWithdrawalProcessor.convertToRepoInputTransaction(request);

      expect(inputTransaction).toStrictEqual({
        workflowName: WorkflowName.WALLET_WITHDRAWAL,
        exchangeRate: 4000,
        memo: "MEMO",
        transactionRef: expect.any(String),
        transactionFees: [
          {
            amount: 1.5,
            currency: Currency.USD,
            type: FeeType.NOBA,
          },
          {
            amount: 0.6,
            currency: Currency.USD,
            type: FeeType.PROCESSING,
          },
        ],
        sessionKey: "SESSION_KEY",
        creditAmount: 191600,
        creditCurrency: Currency.COP,
        debitAmount: 50,
        debitCurrency: Currency.USD,
        debitConsumerID: "1111111111",
      });
    });
  });
});
