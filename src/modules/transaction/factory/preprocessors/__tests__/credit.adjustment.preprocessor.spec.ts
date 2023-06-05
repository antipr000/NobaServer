import { Test, TestingModule } from "@nestjs/testing";
import { AppEnvironment, NOBA_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import { CreditAdjustmentTransactionRequest } from "../../../../../modules/transaction/dto/transaction.service.dto";
import { InputTransaction, WorkflowName } from "../../../../../modules/transaction/domain/Transaction";
import { Currency } from "../../../../../modules/transaction/domain/TransactionTypes";
import { CreditAdjustmentPreprocessor } from "../implementations/credit.adjustment.preprocessor";

describe("CreditAdjustmentPreprocessor", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let creditAdjustmentPreprocessor: CreditAdjustmentPreprocessor;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        environment: AppEnvironment.DEV,
      },
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [CreditAdjustmentPreprocessor],
    }).compile();

    creditAdjustmentPreprocessor = app.get<CreditAdjustmentPreprocessor>(CreditAdjustmentPreprocessor);
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
});
