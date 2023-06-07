import { Test, TestingModule } from "@nestjs/testing";
import { AppEnvironment, NOBA_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import { WalletTransferTransactionRequest } from "../../../../../modules/transaction/dto/transaction.service.dto";
import { InputTransaction, WorkflowName } from "../../../../../modules/transaction/domain/Transaction";
import { Currency } from "../../../../../modules/transaction/domain/TransactionTypes";
import { Consumer } from "../../../../../modules/consumer/domain/Consumer";
import { uuid } from "uuidv4";
import { WalletTransferPreprocessor } from "../implementations/wallet.transfer.preprocessor";
import { ConsumerService } from "../../../../../modules/consumer/consumer.service";
import { instance, when } from "ts-mockito";
import { getMockConsumerServiceWithDefaults } from "../../../../../modules/consumer/mocks/mock.consumer.service";
import { ServiceErrorCode } from "../../../../../core/exception/service.exception";

const getRandomConsumer = (): Consumer => {
  return Consumer.createConsumer({
    id: uuid(),
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
};

describe("WalletTransferPreprocessor", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let consumerService: ConsumerService;
  let walletTransferPreprocessor: WalletTransferPreprocessor;

  beforeEach(async () => {
    consumerService = getMockConsumerServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        environment: AppEnvironment.DEV,
      },
    };

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        WalletTransferPreprocessor,
      ],
    }).compile();

    walletTransferPreprocessor = app.get<WalletTransferPreprocessor>(WalletTransferPreprocessor);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("validate()", () => {
    const VALID_REQUEST: WalletTransferTransactionRequest = {
      debitAmount: 100,
      debitCurrency: Currency.COP,
      debitConsumerIDOrTag: "DEBIT_CONSUMER_ID_OR_TAG",
      creditConsumerIDOrTag: "CREDIT_CONSUMER_ID_OR_TAG",
      memo: "MEMO",
      sessionKey: "SESSION_KEY",
    };

    describe("Static validations", () => {
      it.each(["creditConsumerIDOrTag", "debitConsumerIDOrTag", "debitAmount", "debitCurrency", "sessionKey", "memo"])(
        "should throw SEMANTIC error if '%s' is not specified",
        async field => {
          const request = JSON.parse(JSON.stringify(VALID_REQUEST));
          delete request[field];

          try {
            await walletTransferPreprocessor.validate(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        },
      );

      it.each(["debitCurrency"])("should throw SEMANTIC error if '%s' has INVALID value", async field => {
        const request = JSON.parse(JSON.stringify(VALID_REQUEST));
        request[field] = "INVALID";

        try {
          await walletTransferPreprocessor.validate(request);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining(`${field}`));
        }
      });
    });

    describe("Dynamic validations", () => {
      it("should throw SEMANTIC error if debitConsumerIDOrTag is not valid", async () => {
        when(consumerService.getActiveConsumer("CREDIT_CONSUMER_ID_OR_TAG")).thenResolve(getRandomConsumer());
        when(consumerService.getActiveConsumer("DEBIT_CONSUMER_ID_OR_TAG")).thenResolve(null);

        try {
          await walletTransferPreprocessor.validate(VALID_REQUEST);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining("debitConsumerIDOrTag"));
        }
      });

      it("should throw SEMANTIC error if creditConsumerIDOrTag is not valid", async () => {
        when(consumerService.getActiveConsumer("DEBIT_CONSUMER_ID_OR_TAG")).thenResolve(getRandomConsumer());
        when(consumerService.getActiveConsumer("CREDIT_CONSUMER_ID_OR_TAG")).thenResolve(null);

        try {
          await walletTransferPreprocessor.validate(VALID_REQUEST);
          expect(true).toBe(false);
        } catch (err) {
          expect(err.errorCode).toBe(ServiceErrorCode.SEMANTIC_VALIDATION);
          expect(err.message).toEqual(expect.stringContaining("creditConsumerIDOrTag"));
        }
      });
    });
  });

  describe("convertToRepoInputTransaction()", () => {
    it("should correctly map the CREDIT_ADJUSTMENT transaction to InputTransaction", async () => {
      const request: WalletTransferTransactionRequest = {
        debitAmount: 100,
        debitCurrency: Currency.USD,
        debitConsumerIDOrTag: "DEBIT_CONSUMER_ID_OR_TAG",
        creditConsumerIDOrTag: "CREDIT_CONSUMER_ID_OR_TAG",
        memo: "MEMO",
        sessionKey: "SESSION_KEY",
      };

      const debitConsumer: Consumer = getRandomConsumer();
      const creditConsumer: Consumer = getRandomConsumer();
      when(consumerService.getActiveConsumer("DEBIT_CONSUMER_ID_OR_TAG")).thenResolve(debitConsumer);
      when(consumerService.getActiveConsumer("CREDIT_CONSUMER_ID_OR_TAG")).thenResolve(creditConsumer);

      const response: InputTransaction = await walletTransferPreprocessor.convertToRepoInputTransaction(request);

      expect(response).toStrictEqual({
        transactionRef: expect.any(String),
        workflowName: WorkflowName.WALLET_TRANSFER,
        debitAmount: 100,
        debitCurrency: Currency.USD,
        debitConsumerID: debitConsumer.props.id,
        creditAmount: 100,
        creditCurrency: Currency.USD,
        creditConsumerID: creditConsumer.props.id,
        memo: "MEMO",
        sessionKey: "SESSION_KEY",
        exchangeRate: 1,
        transactionFees: [],
      });
    });
  });
});