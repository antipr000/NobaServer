import { Test, TestingModule } from "@nestjs/testing";
import { WorkflowName } from "../../../domain/Transaction";
import { instance } from "ts-mockito";
import { AppEnvironment, NOBA_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../../core/utils/WinstonModule";
import { CardCreditAdjustmentProcessor } from "../implementations/card.credit.adjustment.processor";
import { CardDebitAdjustmentProcessor } from "../implementations/card.debit.adjustment.processor";
import { CardReversalProcessor } from "../implementations/card.reversal.processor";
import { CardWithdrawalProcessor } from "../implementations/card.withdrawal.processor";
import { CreditAdjustmentProcessor } from "../implementations/credit.adjustment.processor";
import { DebitAdjustmentProcessor } from "../implementations/debit.adjustment.processor";
import { PayrollDepositProcessor } from "../implementations/payroll.deposit.processor";
import { getMockCardCreditAdjustmentPreprocessorWithDefaults } from "../mocks/mock.card.credit.adjustment.processor";
import { getMockCardDebitAdjustmentPreprocessorWithDefaults } from "../mocks/mock.card.debit.adjustment.processor";
import { getMockCardReversalPreprocessorWithDefaults } from "../mocks/mock.card.reversal.processor";
import { getMockCardWithdrawalPreprocessorWithDefaults } from "../mocks/mock.card.withdrawal.processor";
import { getMockCreditAdjustmentPreprocessorWithDefaults } from "../mocks/mock.credit.adjustment.processor";
import { getMockDebitAdjustmentPreprocessorWithDefaults } from "../mocks/mock.debit.adjustment.processor";
import { getMockPayrollDepositPreprocessorWithDefaults } from "../mocks/mock.payroll.deposit.processor";
import { TransactionProcessorFactory } from "../transaction.processor.factory";
import {
  CardReversalTransactionType,
  InitiateTransactionRequest,
  WalletDepositMode,
} from "../../../dto/transaction.service.dto";
import { Currency } from "../../../domain/TransactionTypes";
import { WalletDepositProcessor } from "../implementations/wallet.deposit.processor";
import { getMockWalletDepositProcessorWithDefaults } from "../mocks/mock.wallet.deposit.processor";
import { WalletWithdrawalProcessor } from "../implementations/wallet.withdrawal.processor";
import { getMockWalletWithdrawalProcessorWithDefaults } from "../mocks/mock.wallet.withdrawal.processor";
import { AccountType, DocumentType } from "../../../../../modules/transaction/domain/WithdrawalDetails";
import { WalletTransferProcessor } from "../implementations/wallet.transfer.processor";
import { getMockwalletTransferPreprocessorWithDefaults } from "../mocks/mock.wallet.transfer.processor";

describe("TransactionPreprocessorFactory", () => {
  jest.setTimeout(20000);

  let app: TestingModule;
  let transactionPreprocessorFactory: TransactionProcessorFactory;

  let cardCreditAdjustmentPreprocessor: CardCreditAdjustmentProcessor;
  let cardDebitAdjustmentPreprocessor: CardDebitAdjustmentProcessor;
  let cardReversalPreprocessor: CardReversalProcessor;
  let cardWithdrawalPreprocessor: CardWithdrawalProcessor;
  let creditAdjustmentPreprocessor: CreditAdjustmentProcessor;
  let debitAdjustmentPreprocessor: DebitAdjustmentProcessor;
  let payrollDepositPreprocessor: PayrollDepositProcessor;
  let walletDepositProcessor: WalletDepositProcessor;
  let walletWithdrawalProcessor: WalletWithdrawalProcessor;
  let walletTransferPreprocessor: WalletTransferProcessor;

  beforeEach(async () => {
    cardCreditAdjustmentPreprocessor = instance(getMockCardCreditAdjustmentPreprocessorWithDefaults());
    cardDebitAdjustmentPreprocessor = instance(getMockCardDebitAdjustmentPreprocessorWithDefaults());
    cardReversalPreprocessor = instance(getMockCardReversalPreprocessorWithDefaults());
    cardWithdrawalPreprocessor = instance(getMockCardWithdrawalPreprocessorWithDefaults());
    creditAdjustmentPreprocessor = instance(getMockCreditAdjustmentPreprocessorWithDefaults());
    debitAdjustmentPreprocessor = instance(getMockDebitAdjustmentPreprocessorWithDefaults());
    payrollDepositPreprocessor = instance(getMockPayrollDepositPreprocessorWithDefaults());
    walletDepositProcessor = instance(getMockWalletDepositProcessorWithDefaults());
    walletWithdrawalProcessor = instance(getMockWalletWithdrawalProcessorWithDefaults());
    walletTransferPreprocessor = instance(getMockwalletTransferPreprocessorWithDefaults());

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
          provide: CardCreditAdjustmentProcessor,
          useFactory: () => cardCreditAdjustmentPreprocessor,
        },
        {
          provide: CardDebitAdjustmentProcessor,
          useFactory: () => cardDebitAdjustmentPreprocessor,
        },
        {
          provide: CardReversalProcessor,
          useFactory: () => cardReversalPreprocessor,
        },
        {
          provide: CardWithdrawalProcessor,
          useFactory: () => cardWithdrawalPreprocessor,
        },
        {
          provide: CreditAdjustmentProcessor,
          useFactory: () => creditAdjustmentPreprocessor,
        },
        {
          provide: DebitAdjustmentProcessor,
          useFactory: () => debitAdjustmentPreprocessor,
        },
        {
          provide: PayrollDepositProcessor,
          useFactory: () => payrollDepositPreprocessor,
        },
        {
          provide: WalletDepositProcessor,
          useFactory: () => walletDepositProcessor,
        },
        {
          provide: WalletWithdrawalProcessor,
          useFactory: () => walletWithdrawalProcessor,
        },
        {
          provide: WalletTransferProcessor,
          useFactory: () => walletTransferPreprocessor,
        },
        TransactionProcessorFactory,
      ],
    }).compile();

    transactionPreprocessorFactory = app.get<TransactionProcessorFactory>(TransactionProcessorFactory);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("getPreprocessor()", () => {
    it("should return PayrollDepositPreprocessor instance when workflow name is PAYROLL_DEPOSIT", () => {
      const preprocessor = transactionPreprocessorFactory.getPreprocessor(WorkflowName.PAYROLL_DEPOSIT);
      expect(preprocessor).toBe(payrollDepositPreprocessor);
    });

    it("should return CardWithdrawalPreprocessor instance when workflow name is CARD_WITHDRAWAL", () => {
      const preprocessor = transactionPreprocessorFactory.getPreprocessor(WorkflowName.CARD_WITHDRAWAL);
      expect(preprocessor).toBe(cardWithdrawalPreprocessor);
    });

    it("should return CardReversalPreprocessor instance when workflow name is CARD_REVERSAL", () => {
      const preprocessor = transactionPreprocessorFactory.getPreprocessor(WorkflowName.CARD_REVERSAL);
      expect(preprocessor).toBe(cardReversalPreprocessor);
    });

    it("should return CardCreditAdjustmentPreprocessor instance when workflow name is CARD_CREDIT_ADJUSTMENT", () => {
      const preprocessor = transactionPreprocessorFactory.getPreprocessor(WorkflowName.CARD_CREDIT_ADJUSTMENT);
      expect(preprocessor).toBe(cardCreditAdjustmentPreprocessor);
    });

    it("should return CardDebitAdjustmentPreprocessor instance when workflow name is CARD_DEBIT_ADJUSTMENT", () => {
      const preprocessor = transactionPreprocessorFactory.getPreprocessor(WorkflowName.CARD_DEBIT_ADJUSTMENT);
      expect(preprocessor).toBe(cardDebitAdjustmentPreprocessor);
    });

    it("should return CreditAdjustmentPreprocessor instance when workflow name is CREDIT_ADJUSTMENT", () => {
      const preprocessor = transactionPreprocessorFactory.getPreprocessor(WorkflowName.CREDIT_ADJUSTMENT);
      expect(preprocessor).toBe(creditAdjustmentPreprocessor);
    });

    it("should return DebitAdjustmentPreprocessor instance when workflow name is DEBIT_ADJUSTMENT", () => {
      const preprocessor = transactionPreprocessorFactory.getPreprocessor(WorkflowName.DEBIT_ADJUSTMENT);
      expect(preprocessor).toBe(debitAdjustmentPreprocessor);
    });

    it("should return WalletDepositProcessor instance when workflow name is WALLET_DEPOSIT", () => {
      const preprocessor = transactionPreprocessorFactory.getPreprocessor(WorkflowName.WALLET_DEPOSIT);
      expect(preprocessor).toBe(walletDepositProcessor);
    });

    it("should return WalletWithdrawalProcessor instance when workflow name is WALLET_WITHDRAWAL", () => {
      const preprocessor = transactionPreprocessorFactory.getPreprocessor(WorkflowName.WALLET_WITHDRAWAL);
      expect(preprocessor).toBe(walletWithdrawalProcessor);
    });

    it("should return WalletTransferPreprocessor instance when workflow name is WALLET_TRANSFER", () => {
      const preprocessor = transactionPreprocessorFactory.getPreprocessor(WorkflowName.WALLET_TRANSFER);
      expect(preprocessor).toBe(walletTransferPreprocessor);
    });

    it("should throw error when workflow name is unknown", () => {
      expect(() => transactionPreprocessorFactory.getPreprocessor("UNKNOWN_WORKFLOW_NAME" as any)).toThrowError(
        "No preprocessor found for workflow name: UNKNOWN_WORKFLOW_NAME",
      );
    });
  });

  describe("extractTransactionPreprocessorRequest()", () => {
    const REQUEST_WITH_EVERYTHING: InitiateTransactionRequest = {
      type: WorkflowName.PAYROLL_DEPOSIT,
      payrollDepositRequest: {
        disbursementID: "DISBURSEMENT_ID",
      },
      cardWithdrawalRequest: {
        debitAmountInUSD: 100,
        creditAmount: 100,
        creditCurrency: Currency.COP,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        exchangeRate: 1,
        memo: "MEMO",
        nobaTransactionID: "NOBA_TRANSACTION_ID",
      },
      cardReversalRequest: {
        type: CardReversalTransactionType.DEBIT,
        amountInUSD: 100,
        consumerID: "DEBIT_CONSUMER_ID",
        exchangeRate: 1,
        memo: "MEMO",
        nobaTransactionID: "NOBA_TRANSACTION_ID",
      },
      cardCreditAdjustmentRequest: {
        creditAmount: 100,
        creditCurrency: Currency.COP,
        debitAmount: 10,
        debitCurrency: Currency.USD,
        creditConsumerID: "CREDIT_CONSUMER_ID",
        exchangeRate: 0.1,
        memo: "MEMO",
      },
      cardDebitAdjustmentRequest: {
        creditAmount: 100,
        creditCurrency: Currency.COP,
        debitAmount: 10,
        debitCurrency: Currency.USD,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        exchangeRate: 0.1,
        memo: "MEMO",
      },
      creditAdjustmentRequest: {
        creditAmount: 100,
        creditCurrency: Currency.COP,
        creditConsumerID: "CREDIT_CONSUMER_ID",
        memo: "MEMO",
      },
      debitAdjustmentRequest: {
        debitAmount: 100,
        debitCurrency: Currency.COP,
        debitConsumerID: "DEBIT_CONSUMER_ID",
        memo: "MEMO",
      },
      walletDepositRequest: {
        debitAmount: 100,
        debitCurrency: Currency.COP,
        debitConsumerIDOrTag: "DEBIT_CONSUMER_ID",
        memo: "MEMO",
        depositMode: WalletDepositMode.COLLECTION_LINK,
        sessionKey: "SESSION_KEY",
      },
      walletWithdrawalRequest: {
        debitAmount: 100000,
        debitConsumerIDOrTag: "DEBIT_CONSUMER_ID_OR_TAG",
        creditCurrency: Currency.COP,
        memo: "MEMO",
        sessionKey: "SESSION_KEY",
        withdrawalDetails: {
          bankCode: "BANCOLOMBIA",
          accountNumber: "1234567890",
          documentNumber: "9876543210",
          accountType: AccountType.CHECKING,
          documentType: DocumentType.CC,
        },
      },
      walletTransferRequest: {
        debitAmount: 100,
        debitCurrency: Currency.COP,
        debitConsumerIDOrTag: "DEBIT_CONSUMER_ID_OR_TAG",
        creditConsumerIDOrTag: "CREDIT_CONSUMER_ID_OR_TAG",
        memo: "MEMO",
        sessionKey: "SESSION_KEY",
      },
    };

    it("should return payroll deposit request when workflow name is PAYROLL_DEPOSIT", () => {
      const request = JSON.parse(JSON.stringify(REQUEST_WITH_EVERYTHING));
      request.type = WorkflowName.PAYROLL_DEPOSIT;

      const preprocessorRequest = transactionPreprocessorFactory.extractTransactionProcessorRequest(request);
      expect(preprocessorRequest).toEqual(request.payrollDepositRequest);
    });

    it("should return card withdrawal request when workflow name is CARD_WITHDRAWAL", () => {
      const request = JSON.parse(JSON.stringify(REQUEST_WITH_EVERYTHING));
      request.type = WorkflowName.CARD_WITHDRAWAL;

      const preprocessorRequest = transactionPreprocessorFactory.extractTransactionProcessorRequest(request);
      expect(preprocessorRequest).toEqual(request.cardWithdrawalRequest);
    });

    it("should return card reversal request when workflow name is CARD_REVERSAL", () => {
      const request = JSON.parse(JSON.stringify(REQUEST_WITH_EVERYTHING));
      request.type = WorkflowName.CARD_REVERSAL;

      const preprocessorRequest = transactionPreprocessorFactory.extractTransactionProcessorRequest(request);
      expect(preprocessorRequest).toEqual(request.cardReversalRequest);
    });

    it("should return card credit adjustment request when workflow name is CARD_CREDIT_ADJUSTMENT", () => {
      const request = JSON.parse(JSON.stringify(REQUEST_WITH_EVERYTHING));
      request.type = WorkflowName.CARD_CREDIT_ADJUSTMENT;

      const preprocessorRequest = transactionPreprocessorFactory.extractTransactionProcessorRequest(request);
      expect(preprocessorRequest).toEqual(request.cardCreditAdjustmentRequest);
    });

    it("should return card debit adjustment request when workflow name is CARD_DEBIT_ADJUSTMENT", () => {
      const request = JSON.parse(JSON.stringify(REQUEST_WITH_EVERYTHING));
      request.type = WorkflowName.CARD_DEBIT_ADJUSTMENT;

      const preprocessorRequest = transactionPreprocessorFactory.extractTransactionProcessorRequest(request);
      expect(preprocessorRequest).toEqual(request.cardDebitAdjustmentRequest);
    });

    it("should return credit adjustment request when workflow name is CREDIT_ADJUSTMENT", () => {
      const request = JSON.parse(JSON.stringify(REQUEST_WITH_EVERYTHING));
      request.type = WorkflowName.CREDIT_ADJUSTMENT;

      const preprocessorRequest = transactionPreprocessorFactory.extractTransactionProcessorRequest(request);
      expect(preprocessorRequest).toEqual(request.creditAdjustmentRequest);
    });

    it("should return debit adjustment request when workflow name is DEBIT_ADJUSTMENT", () => {
      const request = JSON.parse(JSON.stringify(REQUEST_WITH_EVERYTHING));
      request.type = WorkflowName.DEBIT_ADJUSTMENT;

      const preprocessorRequest = transactionPreprocessorFactory.extractTransactionProcessorRequest(request);
      expect(preprocessorRequest).toEqual(request.debitAdjustmentRequest);
    });

    it("should return wallet deposit request when workflow name is WALLET_DEPOSIT", () => {
      const request = JSON.parse(JSON.stringify(REQUEST_WITH_EVERYTHING));
      request.type = WorkflowName.WALLET_DEPOSIT;

      const preprocessorRequest = transactionPreprocessorFactory.extractTransactionProcessorRequest(request);
      expect(preprocessorRequest).toEqual(request.walletDepositRequest);
    });

    it("should return wallet withdrawal request when workflow name is WALLET_WITHDRAWAL", () => {
      const request = JSON.parse(JSON.stringify(REQUEST_WITH_EVERYTHING));
      request.type = WorkflowName.WALLET_WITHDRAWAL;

      const preprocessorRequest = transactionPreprocessorFactory.extractTransactionProcessorRequest(request);
      expect(preprocessorRequest).toEqual(request.walletWithdrawalRequest);
    });

    it("should return wallet transfer request when workflow name is WALLET_TRANSFER", () => {
      const request = JSON.parse(JSON.stringify(REQUEST_WITH_EVERYTHING));
      request.type = WorkflowName.WALLET_TRANSFER;

      const preprocessorRequest = transactionPreprocessorFactory.extractTransactionProcessorRequest(request);
      expect(preprocessorRequest).toEqual(request.walletTransferRequest);
    });

    it("should throw error when workflow name is unknown", () => {
      const request = JSON.parse(JSON.stringify(REQUEST_WITH_EVERYTHING));
      request.type = "UNKNOWN_WORKFLOW_NAME" as any;

      expect(() => transactionPreprocessorFactory.extractTransactionProcessorRequest(request)).toThrowError(
        "No preprocessor found for workflow name: UNKNOWN_WORKFLOW_NAME",
      );
    });
  });

  describe("getQuoteProvider()", () => {
    it("should return a walletDepositProcessor if type if WALLET_DEPOSIT", () => {
      const quoteProvider = transactionPreprocessorFactory.getQuoteProvider(WorkflowName.WALLET_DEPOSIT);
      expect(quoteProvider).toEqual(walletDepositProcessor);
    });

    it("should return a walletDepositProcessor if type if WALLET_WITHDRAWAL", () => {
      const quoteProvider = transactionPreprocessorFactory.getQuoteProvider(WorkflowName.WALLET_WITHDRAWAL);
      expect(quoteProvider).toEqual(walletWithdrawalProcessor);
    });

    it.each([
      WorkflowName.CARD_WITHDRAWAL,
      WorkflowName.CARD_REVERSAL,
      WorkflowName.CARD_CREDIT_ADJUSTMENT,
      WorkflowName.CARD_DEBIT_ADJUSTMENT,
      WorkflowName.CREDIT_ADJUSTMENT,
      WorkflowName.DEBIT_ADJUSTMENT,
      WorkflowName.PAYROLL_DEPOSIT,
      WorkflowName.WALLET_TRANSFER,
    ])("should throw for '%s' type", type => {
      expect(() => transactionPreprocessorFactory.getQuoteProvider(type)).toThrowError(
        `No quote provider found for workflow name: ${type}`,
      );
    });
  });

  describe("getWorkflowInitiator()", () => {
    it("should return a walletDepositProcessor if type if WALLET_DEPOSIT", () => {
      const workflowInitiator = transactionPreprocessorFactory.getWorkflowInitiator(WorkflowName.WALLET_DEPOSIT);
      expect(workflowInitiator).toEqual(walletDepositProcessor);
    });

    it("should return a walletDepositProcessor if type if WALLET_WITHDRAWAL", () => {
      const workflowInitiator = transactionPreprocessorFactory.getWorkflowInitiator(WorkflowName.WALLET_WITHDRAWAL);
      expect(workflowInitiator).toEqual(walletWithdrawalProcessor);
    });

    it("should return a walletTransferPreprocessor if type if WALLET_TRANSFER", () => {
      const workflowInitiator = transactionPreprocessorFactory.getWorkflowInitiator(WorkflowName.WALLET_TRANSFER);
      expect(workflowInitiator).toEqual(walletTransferPreprocessor);
    });

    it.each([
      WorkflowName.CARD_WITHDRAWAL,
      WorkflowName.CARD_REVERSAL,
      WorkflowName.CARD_CREDIT_ADJUSTMENT,
      WorkflowName.CARD_DEBIT_ADJUSTMENT,
      WorkflowName.CREDIT_ADJUSTMENT,
      WorkflowName.DEBIT_ADJUSTMENT,
      WorkflowName.PAYROLL_DEPOSIT,
    ])("should throw for '%s' type", type => {
      expect(() => transactionPreprocessorFactory.getWorkflowInitiator(type)).toThrowError(
        `No workflow initiator found for workflow name: ${type}`,
      );
    });
  });
});
