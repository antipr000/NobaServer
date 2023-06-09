import { Test, TestingModule } from "@nestjs/testing";
import { AppEnvironment, NOBA_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import { CardReversalTransactionRequest, CardReversalTransactionType } from "../../../dto/transaction.service.dto";
import { InputTransaction, WorkflowName } from "../../../domain/Transaction";
import { Currency } from "../../../domain/TransactionTypes";
import { CardReversalProcessor } from "../implementations/card.reversal.processor";

describe("CardReversalPreprocessor", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let cardReversalPreprocessor: CardReversalProcessor;

  beforeEach(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        environment: AppEnvironment.DEV,
      },
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [CardReversalProcessor],
    }).compile();

    cardReversalPreprocessor = app.get<CardReversalProcessor>(CardReversalProcessor);
  });

  afterEach(async () => {
    await app.close();
  });

  const VALID_CREDIT_REQUEST: CardReversalTransactionRequest = {
    type: CardReversalTransactionType.CREDIT,
    amountInUSD: 100,
    consumerID: "CREDIT_CONSUMER_ID",
    exchangeRate: 1,
    memo: "MEMO",
    nobaTransactionID: "NOBA_TRANSACTION_ID",
  };
  const VALID_DEBIT_REQUEST: CardReversalTransactionRequest = {
    type: CardReversalTransactionType.DEBIT,
    amountInUSD: 100,
    consumerID: "DEBIT_CONSUMER_ID",
    exchangeRate: 1,
    memo: "MEMO",
    nobaTransactionID: "NOBA_TRANSACTION_ID",
  };

  describe("validate()", () => {
    describe("Static validations", () => {
      it.each(["type", "nobaTransactionID", "consumerID", "amountInUSD", "exchangeRate", "memo"])(
        "should throw error if '%s' is not specified",
        async field => {
          const request = JSON.parse(JSON.stringify(VALID_CREDIT_REQUEST));
          delete request[field];

          try {
            await cardReversalPreprocessor.validate(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        },
      );

      it("should throw error if 'type' field is invalid", async () => {
        const request = JSON.parse(JSON.stringify(VALID_CREDIT_REQUEST));
        request["type"] = "INVALID";

        try {
          await cardReversalPreprocessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.message).toEqual(expect.stringContaining("type"));
        }
      });
    });
  });

  describe("convertToRepoInputTransaction()", () => {
    it("should correctly map the CARD_REVERSAL 'credit' transaction to InputTransaction", async () => {
      const request: CardReversalTransactionRequest = JSON.parse(JSON.stringify(VALID_CREDIT_REQUEST));

      const response: InputTransaction = await cardReversalPreprocessor.convertToRepoInputTransaction(request);

      expect(response).toStrictEqual({
        id: "NOBA_TRANSACTION_ID",
        transactionRef: expect.any(String),
        workflowName: WorkflowName.CARD_REVERSAL,
        creditAmount: 100,
        creditCurrency: Currency.USD,
        creditConsumerID: "CREDIT_CONSUMER_ID",
        memo: "MEMO",
        exchangeRate: 1,
        sessionKey: "CARD_REVERSAL",
        transactionFees: [],
      });
    });

    it("should correctly map the CARD_REVERSAL 'debit' transaction to InputTransaction", async () => {
      const request: CardReversalTransactionRequest = JSON.parse(JSON.stringify(VALID_DEBIT_REQUEST));

      const response: InputTransaction = await cardReversalPreprocessor.convertToRepoInputTransaction(request);

      expect(response).toStrictEqual({
        id: "NOBA_TRANSACTION_ID",
        transactionRef: expect.any(String),
        workflowName: WorkflowName.CARD_REVERSAL,
        debitAmount: 100,
        debitCurrency: Currency.USD,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        memo: "MEMO",
        exchangeRate: 1,
        sessionKey: "CARD_REVERSAL",
        transactionFees: [],
      });
    });
  });
});
