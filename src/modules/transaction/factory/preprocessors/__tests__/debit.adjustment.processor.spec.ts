import { Test, TestingModule } from "@nestjs/testing";
import { AppEnvironment, NOBA_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import { DebitAdjustmentTransactionRequest } from "../../../dto/transaction.service.dto";
import { InputTransaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { DebitAdjustmentProcessor } from "../implementations/debit.adjustment.processor";
import { getRandomTransaction } from "../../../../../modules/transaction/test_utils/test.utils";

describe("DebitAdjustmentPreprocessor", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let debitAdjustmentPreprocessor: DebitAdjustmentProcessor;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        environment: AppEnvironment.DEV,
      },
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [DebitAdjustmentProcessor],
    }).compile();

    debitAdjustmentPreprocessor = app.get<DebitAdjustmentProcessor>(DebitAdjustmentProcessor);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("validate()", () => {
    const VALID_REQUEST: DebitAdjustmentTransactionRequest = {
      debitAmount: 100,
      debitCurrency: Currency.COP,
      debitConsumerID: "DEBIT_CONSUMER_ID",
      memo: "MEMO",
    };

    describe("Static validations", () => {
      it.each(["debitAmount", "debitCurrency", "debitConsumerID", "memo"])(
        "should throw error if '%s' is not specified",
        async field => {
          const request = JSON.parse(JSON.stringify(VALID_REQUEST));
          delete request[field];

          try {
            await debitAdjustmentPreprocessor.validate(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        },
      );

      it.each(["debitCurrency"])("should throw error if '%s' has INVALID value", async field => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request[field] = "INVALID";

        try {
          await debitAdjustmentPreprocessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }
      });
    });
  });

  describe("convertToRepoInputTransaction()", () => {
    it("should correctly map the CREDIT_ADJUSTMENT transaction to InputTransaction", async () => {
      const request: DebitAdjustmentTransactionRequest = {
        debitAmount: 100,
        debitCurrency: Currency.COP,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        memo: "MEMO",
      };

      const response: InputTransaction = await debitAdjustmentPreprocessor.convertToRepoInputTransaction(request);

      expect(response).toStrictEqual({
        transactionRef: expect.any(String),
        workflowName: WorkflowName.DEBIT_ADJUSTMENT,
        debitAmount: 100,
        debitCurrency: Currency.COP,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        memo: "MEMO",
        sessionKey: WorkflowName.DEBIT_ADJUSTMENT,
        exchangeRate: 1,
        transactionFees: [],
        creditAmount: 100,
        creditCurrency: Currency.COP,
      });
    });
  });

  describe("performPostProcessing", () => {
    it("shouldn't do anything", async () => {
      const request: DebitAdjustmentTransactionRequest = {
        debitAmount: 100,
        debitCurrency: Currency.COP,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        memo: "MEMO",
      };

      await debitAdjustmentPreprocessor.performPostProcessing(request, getRandomTransaction("CONSUMER_ID"));
    });
  });
});
