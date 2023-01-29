import { Test, TestingModule } from "@nestjs/testing";
import {
  NOBA_CONFIG_KEY,
  NOBA_TRANSACTION_CONFIG_KEY,
  SERVER_LOG_FILE_PATH,
  WITHDRAWAL_MONO_FEE_AMOUNT,
  WITHDRAWAL_NOBA_FEE_AMOUNT,
} from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { v4 } from "uuid";
import { InputTransaction, Transaction, TransactionStatus, WorkflowName } from "../domain/Transaction";
import { anyNumber, anyString, instance, verify, when } from "ts-mockito";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { Currency } from "../domain/TransactionTypes";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { getMockWorkflowExecutorWithDefaults } from "../../../infra/temporal/mocks/mock.workflow.executor";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { Utils } from "../../../core/utils/Utils";
import { ExchangeRateService } from "../../../modules/common/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../../../modules/common/mocks/mock.exchangerate.service";
import { ExchangeRateDTO } from "../../../modules/common/dto/ExchangeRateDTO";
import { ServiceException } from "../../../core/exception/ServiceException";
import { WalletWithdrawalImpl } from "../factory/wallet.withdrawal.impl";
import { TransactionService } from "../transaction.service";
import { AccountType, DocumentType } from "../domain/WithdrawalDetails";
import { QuoteResponseDTO } from "../dto/QuoteResponseDTO";

describe("WalletWithdrawalImpl Tests", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let workflowExecutor: WorkflowExecutor;
  let exchangeRateService: ExchangeRateService;
  let walletWithdrawalImpl: WalletWithdrawalImpl;

  beforeAll(async () => {
    workflowExecutor = getMockWorkflowExecutorWithDefaults();
    exchangeRateService = getMockExchangeRateServiceWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        [NOBA_TRANSACTION_CONFIG_KEY]: {
          [WITHDRAWAL_MONO_FEE_AMOUNT]: 3000, // In COP
          [WITHDRAWAL_NOBA_FEE_AMOUNT]: 1.5, // In USD
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
        WalletWithdrawalImpl,
      ],
    }).compile();

    walletWithdrawalImpl = app.get<WalletWithdrawalImpl>(WalletWithdrawalImpl);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    // jest.resetAllMocks();
  });

  describe("preprocessTransactionParams", () => {
    it("should preprocess a WALLET_WITHDRAWAL transaction", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transaction, transactionDTO } = getRandomTransaction(consumer.props.id);

      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });

      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.USD, Currency.COP)).thenResolve(exchangeRate);

      const response = await walletWithdrawalImpl.preprocessTransactionParams(transactionDTO, consumer.props.id);
      transactionDTO.debitCurrency = Currency.USD;
      transactionDTO.debitConsumerIDOrTag = consumer.props.id;
      delete transactionDTO.creditConsumerIDOrTag;
      transactionDTO.creditAmount = 5000;
      transactionDTO.exchangeRate = 5;

      expect(response).toStrictEqual(transactionDTO);
    });

    it("should throw ServiceException if the amount is too low (after fees you'd get a negative amount)", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);

      transactionDTO.debitAmount = 0.25;
      await expect(walletWithdrawalImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        "AMOUNT_TOO_LOW",
      );
    });

    it("should throw ServiceException if creditConsumerIDOrTag is set", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      transactionDTO.creditConsumerIDOrTag = "creditConsumerIDOrTag";

      await expect(walletWithdrawalImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if creditAmount is set", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      transactionDTO.creditAmount = 500;

      await expect(walletWithdrawalImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if debitCurrency is set", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      transactionDTO.debitCurrency = Currency.COP;

      await expect(walletWithdrawalImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if debitAmount is 0", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      transactionDTO.debitAmount = 0;

      await expect(walletWithdrawalImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if creditCurrency is not set", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      delete transactionDTO.creditCurrency;

      await expect(walletWithdrawalImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if withdrawalData is missing", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      delete transactionDTO.withdrawalData;

      await expect(walletWithdrawalImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });

    it("should throw ServiceException if transaction cannot be quoted", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transactionDTO } = getRandomTransaction(consumer.props.id);
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.USD, Currency.COP)).thenResolve(null);
      await expect(walletWithdrawalImpl.preprocessTransactionParams(transactionDTO, consumer.props.id)).rejects.toThrow(
        ServiceException,
      );
    });
  });

  describe("initiateWorkflow", () => {
    it("should initiate a WALLET_DEPOSIT workflow", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transaction } = getRandomTransaction(consumer.props.id);

      when(workflowExecutor.executeDebitConsumerWalletWorkflow(anyString(), anyNumber(), anyString())).thenResolve();

      await walletWithdrawalImpl.initiateWorkflow(transaction);

      verify(
        workflowExecutor.executeDebitConsumerWalletWorkflow(
          transaction.debitConsumerID,
          transaction.debitAmount,
          transaction.transactionRef,
        ),
      ).once();
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

      await expect(walletWithdrawalImpl.initiateWorkflow(transaction)).rejects.toThrow(ServiceException);
    });
  });

  describe("getTransactionQuote", () => {
    it("should get a quote for a collection", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.USD, Currency.COP)).thenResolve(exchangeRate);
      const quote = await walletWithdrawalImpl.getTransactionQuote(50, Currency.USD, Currency.COP);
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
        await walletWithdrawalImpl.getTransactionQuote(1, Currency.USD, Currency.COP);
      }).rejects.toThrow("AMOUNT_TOO_LOW");
    });

    it("should throw a ServiceException if exchange rate is undefined", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.USD, Currency.COP)).thenResolve(null);
      expect(async () => {
        await walletWithdrawalImpl.getTransactionQuote(50, Currency.USD, Currency.COP);
      }).rejects.toThrow(ServiceException);
    });

    it("should throw a ServiceException if the desired currency is not COP", async () => {
      when(exchangeRateService.getExchangeRateForCurrencyPair(Currency.COP, Currency.USD)).thenResolve(exchangeRate);
      expect(async () => {
        await walletWithdrawalImpl.getTransactionQuote(50, Currency.COP, Currency.USD);
      }).rejects.toThrow(ServiceException);
    });
  });
});

const exchangeRate = {
  bankRate: 5000,
  numeratorCurrency: Currency.USD,
  denominatorCurrency: Currency.COP,
  expirationTimestamp: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hrs
  nobaRate: 4000,
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
    exchangeRate: 4000,
    status: TransactionStatus.INITIATED,
    workflowName: WorkflowName.WALLET_WITHDRAWAL,
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
    withdrawalData: {
      accountNumber: "123456789",
      accountType: AccountType.CHECKING,
      bankCode: "123",
      documentNumber: "123456789",
      documentType: DocumentType.CC,
    },
  };

  const inputTransaction: InputTransaction = {
    transactionRef: transaction.transactionRef,
    workflowName: transaction.workflowName,
    exchangeRate: transaction.exchangeRate,
    memo: transaction.memo,
    sessionKey: transaction.sessionKey,
  };

  transaction.debitAmount = 100;
  transaction.debitConsumerID = debitConsumerID;
  transaction.debitCurrency = Currency.USD;
  transaction.creditCurrency = Currency.COP;

  transactionDTO.debitAmount = transaction.debitAmount;
  transactionDTO.debitConsumerIDOrTag = transaction.debitConsumerID;
  transactionDTO.creditCurrency = transaction.creditCurrency as Currency;

  inputTransaction.debitAmount = transaction.debitAmount;
  inputTransaction.debitConsumerID = transaction.debitConsumerID;
  inputTransaction.creditCurrency = transaction.creditCurrency;

  return { transaction, transactionDTO, inputTransaction };
};
