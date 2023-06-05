import { Test, TestingModule } from "@nestjs/testing";
import { AppEnvironment, NOBA_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import { CardWithdrawalTransactionRequest } from "../../../../../modules/transaction/dto/transaction.service.dto";
import { WorkflowName } from "../../../../../modules/transaction/domain/Transaction";
import { Currency } from "../../../../../modules/transaction/domain/TransactionTypes";
import { CardWithdrawalPreprocessor } from "../implementations/card.withdrawal.preprocessro";

describe("CardWithdrawalPreprocessor", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let cardWithdrawalPreprocessor: CardWithdrawalPreprocessor;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        environment: AppEnvironment.DEV,
      },
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [CardWithdrawalPreprocessor],
    }).compile();

    cardWithdrawalPreprocessor = app.get<CardWithdrawalPreprocessor>(CardWithdrawalPreprocessor);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("validate()", () => {
    describe("Static validations", () => {
      const VALID_REQUEST: CardWithdrawalTransactionRequest = {
        debitAmountInUSD: 100,
        creditAmount: 100,
        creditCurrency: Currency.COP,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        exchangeRate: 1,
        memo: "MEMO",
        nobaTransactionID: "NOBA_TRANSACTION_ID",
      };

      it.each([
        "nobaTransactionID",
        "debitConsumerID",
        "debitAmountInUSD",
        "exchangeRate",
        "memo",
        "creditCurrency",
        "creditAmount",
      ])("should throw error if '%s' is not specified", async field => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        delete request[field];

        try {
          await cardWithdrawalPreprocessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }
      });

      it.each(["creditCurrency"])("should throw error if '%s' has INVALID value", async field => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request[field] = "INVALID";

        try {
          await cardWithdrawalPreprocessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }
      });
    });
  });

  describe("convertToRepoInputTransaction()", () => {
    it("should correctly map the CARD_WITHDRAWAL request to InputTransaction", async () => {
      const request: CardWithdrawalTransactionRequest = {
        debitAmountInUSD: 100,
        creditAmount: 100,
        creditCurrency: Currency.COP,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        exchangeRate: 1,
        memo: "MEMO",
        nobaTransactionID: "NOBA_TRANSACTION_ID",
      };

      const response = await cardWithdrawalPreprocessor.convertToRepoInputTransaction(request);

      expect(response).toStrictEqual({
        id: "NOBA_TRANSACTION_ID",
        transactionRef: expect.any(String),
        workflowName: WorkflowName.CARD_WITHDRAWAL,
        debitAmount: 100,
        debitCurrency: Currency.USD,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        creditAmount: 100,
        creditCurrency: Currency.COP,
        memo: "MEMO",
        exchangeRate: 1,
        sessionKey: "CARD_WITHDRAWAL",
        transactionFees: [],
      });
    });
  });
});
