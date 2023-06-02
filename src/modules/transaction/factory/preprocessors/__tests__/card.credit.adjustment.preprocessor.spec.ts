import { Test, TestingModule } from "@nestjs/testing";
import { AppEnvironment, NOBA_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import {
  CardCreditAdjustmentTransactionRequest,
  CardReversalTransactionRequest,
  CardReversalTransactionType,
} from "../../../../../modules/transaction/dto/transaction.service.dto";
import { InputTransaction, WorkflowName } from "../../../../../modules/transaction/domain/Transaction";
import { Currency } from "../../../../../modules/transaction/domain/TransactionTypes";
import { CardCreditAdjustmentPreprocessor } from "../implementations/card.credit.adjustment.preprocessor";

describe("CardCreditAdjustmentPreprocessor", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let cardCreditAdjustmentPreprocessor: CardCreditAdjustmentPreprocessor;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        environment: AppEnvironment.DEV,
      },
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [CardCreditAdjustmentPreprocessor],
    }).compile();

    cardCreditAdjustmentPreprocessor = app.get<CardCreditAdjustmentPreprocessor>(CardCreditAdjustmentPreprocessor);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("validate()", () => {
    describe("Static validations", () => {
      const VALID_REQUEST: CardCreditAdjustmentTransactionRequest = {
        creditAmount: 100,
        creditCurrency: Currency.COP,
        debitAmount: 10,
        debitCurrency: Currency.USD,
        creditConsumerID: "CREDIT_CONSUMER_ID",
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
        "creditConsumerID",
      ])("should throw error if '%s' is not specified", async field => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        delete request[field];

        try {
          await cardCreditAdjustmentPreprocessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }
      });

      it.each(["creditCurrency", "debitCurrency"])("should throw error if '%s' has INVALID value", async field => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request[field] = "INVALID";

        try {
          await cardCreditAdjustmentPreprocessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }
      });
    });
  });

  describe("convertToRepoInputTransaction()", () => {
    it("should correctly map the CARD_CREDIT_ADJUSTMENT transaction to InputTransaction", async () => {
      const request: CardCreditAdjustmentTransactionRequest = {
        creditAmount: 100,
        creditCurrency: Currency.COP,
        debitAmount: 10,
        debitCurrency: Currency.USD,
        creditConsumerID: "CREDIT_CONSUMER_ID",
        exchangeRate: 0.1,
        memo: "MEMO",
      };

      const response: InputTransaction = await cardCreditAdjustmentPreprocessor.convertToRepoInputTransaction(request);

      expect(response).toStrictEqual({
        transactionRef: expect.any(String),
        workflowName: WorkflowName.CARD_CREDIT_ADJUSTMENT,
        debitAmount: 10,
        debitCurrency: Currency.USD,
        creditConsumerID: "CREDIT_CONSUMER_ID",
        creditAmount: 100,
        creditCurrency: Currency.COP,
        memo: "MEMO",
        exchangeRate: 0.1,
        sessionKey: "CARD_ADJUSTMENTS",
        transactionFees: [],
      });
    });
  });
});
