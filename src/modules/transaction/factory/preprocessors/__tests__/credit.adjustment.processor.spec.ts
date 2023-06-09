import { Test, TestingModule } from "@nestjs/testing";
import { AppEnvironment, NOBA_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import { CreditAdjustmentTransactionRequest } from "../../../dto/transaction.service.dto";
import { InputTransaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { CreditAdjustmentProcessor } from "../implementations/credit.adjustment.processor";
import { getRandomTransaction } from "../../../../../modules/transaction/test_utils/test.utils";

describe("CreditAdjustmentPreprocessor", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let creditAdjustmentPreprocessor: CreditAdjustmentProcessor;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        environment: AppEnvironment.DEV,
      },
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [CreditAdjustmentProcessor],
    }).compile();

    creditAdjustmentPreprocessor = app.get<CreditAdjustmentProcessor>(CreditAdjustmentProcessor);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("validate()", () => {
    const VALID_REQUEST: CreditAdjustmentTransactionRequest = {
      creditAmount: 100,
      creditCurrency: Currency.COP,
      creditConsumerID: "CREDIT_CONSUMER_ID",
      memo: "MEMO",
    };

    describe("Static validations", () => {
      it.each(["creditAmount", "creditCurrency", "creditConsumerID", "memo"])(
        "should throw error if '%s' is not specified",
        async field => {
          const request = JSON.parse(JSON.stringify(VALID_REQUEST));
          delete request[field];

          try {
            await creditAdjustmentPreprocessor.validate(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        },
      );

      it.each(["creditCurrency"])("should throw error if '%s' has INVALID value", async field => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request[field] = "INVALID";

        try {
          await creditAdjustmentPreprocessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }
      });
    });
  });

  describe("convertToRepoInputTransaction()", () => {
    it("should correctly map the CREDIT_ADJUSTMENT transaction to InputTransaction", async () => {
      const request: CreditAdjustmentTransactionRequest = {
        creditAmount: 100,
        creditCurrency: Currency.COP,
        creditConsumerID: "CREDIT_CONSUMER_ID",
        memo: "MEMO",
      };

      const response: InputTransaction = await creditAdjustmentPreprocessor.convertToRepoInputTransaction(request);

      expect(response).toStrictEqual({
        transactionRef: expect.any(String),
        workflowName: WorkflowName.CREDIT_ADJUSTMENT,
        creditAmount: 100,
        creditCurrency: Currency.COP,
        creditConsumerID: "CREDIT_CONSUMER_ID",
        memo: "MEMO",
        sessionKey: WorkflowName.CREDIT_ADJUSTMENT,
        exchangeRate: 1,
        transactionFees: [],
        debitAmount: 100,
        debitCurrency: Currency.COP,
      });
    });
  });

  describe("performPostProcessing", () => {
    it("shouldn't do anything", async () => {
      const request: CreditAdjustmentTransactionRequest = {
        creditAmount: 100,
        creditCurrency: Currency.COP,
        creditConsumerID: "CREDIT_CONSUMER_ID",
        memo: "MEMO",
      };

      await creditAdjustmentPreprocessor.performPostProcessing(request, getRandomTransaction("CONSUMER_ID"));
    });
  });
});
