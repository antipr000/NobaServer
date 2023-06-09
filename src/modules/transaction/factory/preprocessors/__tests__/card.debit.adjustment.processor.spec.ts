import { Test, TestingModule } from "@nestjs/testing";
import { AppEnvironment, NOBA_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import { CardDebitAdjustmentTransactionRequest } from "../../../dto/transaction.service.dto";
import { InputTransaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { CardDebitAdjustmentProcessor } from "../implementations/card.debit.adjustment.processor";
import { getRandomTransaction } from "../../../../../modules/transaction/test_utils/test.utils";

describe("CardDebitAdjustmentPreprocessor", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let cardDebitAdjustmentPreprocessor: CardDebitAdjustmentProcessor;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        environment: AppEnvironment.DEV,
      },
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [CardDebitAdjustmentProcessor],
    }).compile();

    cardDebitAdjustmentPreprocessor = app.get<CardDebitAdjustmentProcessor>(CardDebitAdjustmentProcessor);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("validate()", () => {
    describe("Static validations", () => {
      const VALID_REQUEST: CardDebitAdjustmentTransactionRequest = {
        creditAmount: 100,
        creditCurrency: Currency.COP,
        debitAmount: 10,
        debitCurrency: Currency.USD,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        exchangeRate: 0.1,
        memo: "MEMO",
      };

      it.each([
        "debitAmount",
        "debitCurrency",
        "creditAmount",
        "creditCurrency",
        "exchangeRate",
        "memo",
        "debitConsumerID",
      ])("should throw error if '%s' is not specified", async field => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        delete request[field];

        try {
          await cardDebitAdjustmentPreprocessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }
      });

      it.each(["creditCurrency", "debitCurrency"])("should throw error if '%s' has INVALID value", async field => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request[field] = "INVALID";

        try {
          await cardDebitAdjustmentPreprocessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }
      });
    });
  });

  describe("convertToRepoInputTransaction()", () => {
    it("should correctly map the CARD_DEBIT_ADJUSTMENT transaction to InputTransaction", async () => {
      const request: CardDebitAdjustmentTransactionRequest = {
        creditAmount: 100,
        creditCurrency: Currency.COP,
        debitAmount: 10,
        debitCurrency: Currency.USD,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        exchangeRate: 0.1,
        memo: "MEMO",
      };

      const response: InputTransaction = await cardDebitAdjustmentPreprocessor.convertToRepoInputTransaction(request);

      expect(response).toStrictEqual({
        transactionRef: expect.any(String),
        workflowName: WorkflowName.CARD_DEBIT_ADJUSTMENT,
        debitAmount: 10,
        debitCurrency: Currency.USD,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        creditAmount: 100,
        creditCurrency: Currency.COP,
        memo: "MEMO",
        exchangeRate: 0.1,
        sessionKey: "CARD_ADJUSTMENTS",
        transactionFees: [],
      });
    });
  });

  describe("performPostProcessing", () => {
    it("shouldn't do anything", async () => {
      const request: CardDebitAdjustmentTransactionRequest = {
        creditAmount: 100,
        creditCurrency: Currency.COP,
        debitAmount: 10,
        debitCurrency: Currency.USD,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        exchangeRate: 0.1,
        memo: "MEMO",
      };

      await cardDebitAdjustmentPreprocessor.performPostProcessing(request, getRandomTransaction("CONSUMER_ID"));
    });
  });
});
