import { Test, TestingModule } from "@nestjs/testing";
import {
  DEPOSIT_FEE_FIXED_AMOUNT,
  DEPOSIT_FEE_MULTIPLIER,
  DEPOSIT_NOBA_FEE_AMOUNT,
  COLLECTION_FEE_FIXED_AMOUNT,
  COLLECTION_FEE_MULTIPLIER,
  COLLECTION_NOBA_FEE_AMOUNT,
  NOBA_CONFIG_KEY,
  NOBA_TRANSACTION_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
} from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { v4 } from "uuid";
import { InputTransaction, Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { anyString, deepEqual, instance, verify, when } from "ts-mockito";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { Currency } from "../domain/TransactionTypes";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { getMockWorkflowExecutorWithDefaults } from "../../../infra/temporal/mocks/mock.workflow.executor";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { Utils } from "../../../core/utils/Utils";
import { ExchangeRateService } from "../../../modules/common/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../../../modules/common/mocks/mock.exchangerate.service";
import { MonoService } from "../../../modules/psp/mono/mono.service";
import { getMockMonoServiceWithDefaults } from "../../../modules/psp/mono/mocks/mock.mono.service";
import { ExchangeRateDTO } from "../../../modules/common/dto/ExchangeRateDTO";
import { WalletDepositImpl } from "../factory/wallet.deposit.impl";
import { ServiceException } from "../../../core/exception/service.exception";
import { MonoCurrency, MonoTransactionType } from "../../../modules/psp/domain/Mono";
import { TransactionFlags } from "../domain/TransactionFlags";

describe("WalletDepositImpl Tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let workflowExecutor: WorkflowExecutor;
  let monoService: MonoService;
  let exchangeRateService: ExchangeRateService;
  let walletDepositImpl: WalletDepositImpl;

  beforeAll(async () => {
    workflowExecutor = getMockWorkflowExecutorWithDefaults();
    exchangeRateService = getMockExchangeRateServiceWithDefaults();
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
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: WorkflowExecutor,
          useFactory: () => instance(workflowExecutor),
        },
        {
          provide: ExchangeRateService,
          useFactory: () => instance(exchangeRateService),
        },
        {
          provide: MonoService,
          useFactory: () => instance(monoService),
        },
        WalletDepositImpl,
      ],
    }).compile();

    walletDepositImpl = app.get<WalletDepositImpl>(WalletDepositImpl);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    // jest.resetAllMocks();
  });

  describe("preprocessTransactionParams", () => {
    it("should preprocess a WALLET_DEPOSIT transaction", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transaction, transactionDTO } = getRandomTransaction(consumer.props.id);
      const exchangeRate: ExchangeRateDTO = {
        bankRate: 0.0002,
        numeratorCurrency: Currency.COP,
        denominatorCurrency: Currency.USD,
        expirationTimestamp: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hrs
        nobaRate: 0.00025,
      };
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });

      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve(exchangeRate);

      const response = await walletDepositImpl.preprocessTransactionParams(transactionDTO, consumer.props.id);
      expect(response).toStrictEqual({
        ...transactionDTO,
        creditCurrency: Currency.USD,
        debitConsumerIDOrTag: consumer.props.id,
        creditAmount: 11.25,
        exchangeRate: 0.00025,
      });
    });

    it("should throw ServiceException if creditConsumerIDOrTag is set", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      transactionDTO.creditConsumerIDOrTag = "creditConsumerIDOrTag";

      await expect(walletDepositImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if creditAmount is set", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      transactionDTO.creditAmount = 500;

      await expect(walletDepositImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if debitAmount is less than 0", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      transactionDTO.debitAmount = -500;

      await expect(walletDepositImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if debitCurrency is not COP", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      transactionDTO.debitCurrency = Currency.USD;

      await expect(walletDepositImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if exchangeRate is not set", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve(null);
      await expect(walletDepositImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });
  });

  describe("initiateWorkflow", () => {
    it("should initiate a WALLET_DEPOSIT workflow", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transaction } = getRandomTransaction(consumer.props.id);

      when(
        monoService.createMonoTransaction(
          deepEqual({
            type: MonoTransactionType.COLLECTION_LINK_DEPOSIT,
            amount: transaction.debitAmount,
            currency: transaction.debitCurrency as MonoCurrency,
            consumerID: transaction.debitConsumerID,
            nobaTransactionID: transaction.id,
          }),
        ),
      ).thenResolve();

      when(workflowExecutor.executeCreditConsumerWalletWorkflow(anyString(), anyString())).thenResolve();

      await walletDepositImpl.initiateWorkflow(transaction, [TransactionFlags.IS_COLLECTION]);

      verify(workflowExecutor.executeCreditConsumerWalletWorkflow(transaction.id, transaction.transactionRef)).once();
    });

    it("should throw ServiceException if both credit and debit consumer id is set", async () => {
      const consumer = getRandomConsumer("consumerID");
      let { transaction } = getRandomTransaction(consumer.props.id);
      transaction = {
        ...transaction,
        creditCurrency: Currency.USD,
        debitConsumerID: consumer.props.id,
        creditAmount: 500,
        exchangeRate: 5,
        creditConsumerID: "fake-id",
      };

      await expect(walletDepositImpl.initiateWorkflow(transaction, [TransactionFlags.IS_COLLECTION])).rejects.toThrow(
        ServiceException,
      );
    });
  });

  describe("getTransactionQuote", () => {
    it("should get a quote for a collection", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve(exchangeRate);

      const quote = await walletDepositImpl.getTransactionQuote(100000, Currency.COP, Currency.USD, [
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

      const quote = await walletDepositImpl.getTransactionQuote(100000, Currency.COP, Currency.USD, []);

      expect(quote).toEqual({
        nobaFee: "0.50",
        processingFee: "0.75",
        totalFee: "1.25",
        quoteAmount: "25.00",
        quoteAmountWithFees: "23.75",
        nobaRate: "0.00025",
      });
    });

    it("should throw a ServiceException if exchange rate is undefined", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve(null);
      expect(async () => {
        await walletDepositImpl.getTransactionQuote(100, Currency.COP, Currency.USD);
      }).rejects.toThrow(ServiceException);
    });

    it("should throw a ServiceException if the desired currency is not USD", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.USD, Currency.COP)).thenResolve(exchangeRate);
      expect(async () => {
        await walletDepositImpl.getTransactionQuote(100, Currency.USD, Currency.COP);
      }).rejects.toThrow(ServiceException);
    });
  });
});

const exchangeRate = {
  bankRate: 0.00021,
  numeratorCurrency: Currency.COP,
  denominatorCurrency: Currency.USD,
  expirationTimestamp: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hrs
  nobaRate: 0.00025,
};

const getRandomConsumer = (consumerID: string): Consumer => {
  const email = `${v4()}_${new Date().valueOf()}@noba.com`;
  const props: Partial<ConsumerProps> = {
    id: consumerID,
    firstName: "Noba",
    lastName: "lastName",
    email: email,
    displayEmail: email.toUpperCase(),
    referralCode: Utils.getAlphaNanoID(15),
    phone: `+1${Math.floor(Math.random() * 1000000000)}`,
  };
  return Consumer.createConsumer(props);
};

const getRandomTransaction = (
  debitConsumerID: string,
): { transaction: Transaction; transactionDTO: InitiateTransactionDTO; inputTransaction: InputTransaction } => {
  const transaction: Transaction = {
    transactionRef: Utils.generateLowercaseUUID(true),
    exchangeRate: 1,
    status: TransactionStatus.INITIATED,
    workflowName: WorkflowName.WALLET_DEPOSIT,
    id: v4(),
    sessionKey: v4(),
    memo: "New transaction",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  const transactionDTO: InitiateTransactionDTO = {
    workflowName: transaction.workflowName,
    exchangeRate: transaction.exchangeRate,
    memo: transaction.memo,
    options: [TransactionFlags.IS_COLLECTION],
  };

  const inputTransaction: InputTransaction = {
    transactionRef: transaction.transactionRef,
    workflowName: transaction.workflowName,
    exchangeRate: transaction.exchangeRate,
    memo: transaction.memo,
    sessionKey: transaction.sessionKey,
  };

  transaction.debitAmount = 50000;
  transaction.debitCurrency = Currency.COP;
  transaction.debitConsumerID = debitConsumerID;

  transactionDTO.debitAmount = transaction.debitAmount;
  transactionDTO.debitCurrency = transaction.debitCurrency as Currency;
  transactionDTO.debitConsumerIDOrTag = transaction.debitConsumerID;

  inputTransaction.debitAmount = transaction.debitAmount;
  inputTransaction.debitCurrency = transaction.debitCurrency;
  inputTransaction.debitConsumerID = transaction.debitConsumerID;
  inputTransaction.creditAmount = transaction.debitAmount;
  inputTransaction.creditCurrency = transaction.debitCurrency;

  return { transaction, transactionDTO, inputTransaction };
};
