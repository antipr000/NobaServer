import { Test, TestingModule } from "@nestjs/testing";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { v4 } from "uuid";
import {
  InputTransaction,
  Transaction,
  TransactionStatus,
  UpdateTransaction,
  WorkflowName,
} from "../domain/Transaction";
import { ITransactionRepo } from "../repo/transaction.repo";
import { getMockTransactionRepoWithDefaults } from "../mocks/mock.sql.transaction.repo";
import { TRANSACTION_REPO_PROVIDER, WITHDRAWAL_DETAILS_REPO_PROVIDER } from "../repo/transaction.repo.module";
import { anything, capture, deepEqual, instance, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { Currency } from "../domain/TransactionTypes";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { Utils } from "../../../core/utils/Utils";
import { ServiceException } from "../../../core/exception/ServiceException";
import { ExchangeRateService } from "../../../modules/common/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../../../modules/common/mocks/mock.exchangerate.service";
import { TransactionEventDTO } from "../dto/TransactionEventDTO";
import { InputTransactionEvent, TransactionEvent } from "../domain/TransactionEvent";
import { UpdateTransactionDTO } from "../dto/TransactionDTO";
import { ExchangeRateDTO } from "../../../modules/common/dto/ExchangeRateDTO";
import { VerificationService } from "../../../modules/verification/verification.service";
import { getMockVerificationServiceWithDefaults } from "../../../modules/verification/mocks/mock.verification.service";
import { WorkflowFactory } from "../factory/workflow.factory";
import { WalletTransferImpl } from "../factory/wallet.transfer.impl";
import { getMockWorkflowFactoryWithDefaults } from "../mocks/mock.workflow.factory";
import { getMockWalletTransferImplWithDefaults } from "../mocks/mock.wallet.transfer.impl";
import { IWithdrawalDetailsRepo } from "../repo/withdrawal.details.repo";
import { getMockWithdrawalDetailsRepoWithDefaults } from "../mocks/mock.withdrawal.repo";
import { AccountType, DocumentType, InputWithdrawalDetails, WithdrawalDetails } from "../domain/WithdrawalDetails";
import { WalletWithdrawalImpl } from "../factory/wallet.withdrawal.impl";
import { WalletDepositImpl } from "../factory/wallet.deposit.impl";
import { getMockWalletWithdrawalImplWithDefaults } from "../mocks/mock.wallet.withdrawal.impl";
import { getMockWalletDepositImplWithDefaults } from "../mocks/mock.wallet.deposit.impl";
import { BankFactory } from "../../../modules/psp/factory/bank.factory";
import { getMockBankFactoryWithDefaults } from "../../../modules/psp/mocks/mock.bank.factory";
import { BankName, DebitBankFactoryRequest } from "../../../modules/psp/domain/BankFactoryTypes";
import { BankMonoImpl } from "../../../modules/psp/factory/bank.mono.impl";
import { getMockBankMonoImplWithDefaults } from "../../../modules/psp/mocks/mock.bank.mono.impl";

describe("TransactionServiceTests", () => {
  jest.setTimeout(20000);

  let transactionRepo: ITransactionRepo;
  let app: TestingModule;
  let transactionService: TransactionService;
  let consumerService: ConsumerService;
  let verificationService: VerificationService;
  let exchangeRateService: ExchangeRateService;
  let workflowFactory: WorkflowFactory;
  let walletTransferImpl: WalletTransferImpl;
  let walletWithdrawalImpl: WalletWithdrawalImpl;
  let walletDepositImpl: WalletDepositImpl;
  let bankFactory: BankFactory;
  let bankMonoImpl: BankMonoImpl;
  let withdrawalDetailsRepo: IWithdrawalDetailsRepo;

  beforeEach(async () => {
    transactionRepo = getMockTransactionRepoWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    verificationService = getMockVerificationServiceWithDefaults();
    exchangeRateService = getMockExchangeRateServiceWithDefaults();
    workflowFactory = getMockWorkflowFactoryWithDefaults();
    walletTransferImpl = getMockWalletTransferImplWithDefaults();
    walletWithdrawalImpl = getMockWalletWithdrawalImplWithDefaults();
    walletDepositImpl = getMockWalletDepositImplWithDefaults();
    bankFactory = getMockBankFactoryWithDefaults();
    bankMonoImpl = getMockBankMonoImplWithDefaults();
    withdrawalDetailsRepo = getMockWithdrawalDetailsRepoWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************

    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: TRANSACTION_REPO_PROVIDER,
          useFactory: () => instance(transactionRepo),
        },
        {
          provide: ExchangeRateService,
          useFactory: () => instance(exchangeRateService),
        },
        {
          provide: VerificationService,
          useFactory: () => instance(verificationService),
        },
        {
          provide: WorkflowFactory,
          useFactory: () => instance(workflowFactory),
        },
        {
          provide: BankFactory,
          useFactory: () => instance(bankFactory),
        },
        {
          provide: WITHDRAWAL_DETAILS_REPO_PROVIDER,
          useFactory: () => instance(withdrawalDetailsRepo),
        },
        TransactionService,
      ],
    }).compile();

    transactionService = app.get<TransactionService>(TransactionService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    // jest.resetAllMocks();
  });

  describe("getTransactionByTransactionRef", () => {
    it("should return the transaction if the debitConsumerID matches", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);

      const returnedTransaction = await transactionService.getTransactionByTransactionRef(
        transaction.transactionRef,
        "consumerID",
      );
      expect(returnedTransaction).toEqual(transaction);
    });

    it("should return the transaction if the creditConsumerID matches", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);

      const returnedTransaction = await transactionService.getTransactionByTransactionRef(
        transaction.transactionRef,
        "consumerID",
      );
      expect(returnedTransaction).toEqual(transaction);
    });

    it("should throw ServiceException if transaction is not found", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(null);

      await expect(
        transactionService.getTransactionByTransactionRef(transaction.transactionRef, "consumerID"),
      ).rejects.toThrowError(ServiceException);
    });

    it("should throw ServiceException if transaction is found but does not belong to specified consumer", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);

      await expect(
        transactionService.getTransactionByTransactionRef(transaction.transactionRef, "anotherConsumerID"),
      ).rejects.toThrowError(ServiceException);
    });
  });

  describe("getTransactionByTransactionID", () => {
    it("should return the transaction if the transactionID matches", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);

      const returnedTransaction = await transactionService.getTransactionByTransactionID(transaction.id);
      expect(returnedTransaction).toEqual(transaction);
    });

    it("should return 'null' if the transaction is not found", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(null);

      const returnedTransaction = await transactionService.getTransactionByTransactionID(transaction.id);
      expect(returnedTransaction).toBeNull();
    });
  });

  describe("initiateTransaction", () => {
    it("should initiate a WALLET_TRANSFER transaction", async () => {
      const consumer = getRandomConsumer("consumerID");
      const consumer2 = getRandomConsumer("consumerID2");
      const { transaction, transactionDTO } = getRandomTransaction(consumer.props.id, consumer2.props.id);
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });

      const processedTransactionDTO: InitiateTransactionDTO = {
        ...transactionDTO,
        debitConsumerIDOrTag: consumer.props.id,
        creditAmount: transactionDTO.debitAmount,
        creditCurrency: transactionDTO.debitCurrency,
        exchangeRate: 1,
      };
      when(consumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getActiveConsumer(consumer2.props.id)).thenResolve(consumer2);
      when(transactionRepo.createTransaction(anything())).thenResolve(transaction);
      when(withdrawalDetailsRepo.addWithdrawalDetails(anything())).thenResolve(null);
      when(workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_TRANSFER)).thenReturn(
        instance(walletTransferImpl),
      );
      when(walletTransferImpl.preprocessTransactionParams(deepEqual(transactionDTO), consumer.props.id)).thenResolve(
        processedTransactionDTO,
      );
      when(walletTransferImpl.initiateWorkflow(deepEqual(transaction))).thenResolve();

      const returnedTransaction = await transactionService.initiateTransaction(
        transactionDTO,
        consumer.props.id,
        transaction.sessionKey,
      );

      expect(returnedTransaction).toEqual(transaction);

      // IMPORTANT TO VERIFY THIS CORRECTLY :)
      const [propagatedTransactionToSave] = capture(transactionRepo.createTransaction).last();
      expect(propagatedTransactionToSave).toEqual({
        transactionRef: transaction.transactionRef,
        workflowName: "WALLET_TRANSFER",
        debitConsumerID: "consumerID",
        creditConsumerID: "consumerID2",
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.debitAmount, // as exchange rate is always 1.
        debitCurrency: "USD",
        creditCurrency: "USD",
        exchangeRate: 1, // Always 1 for wallet transfer
        sessionKey: transaction.sessionKey,
        memo: transaction.memo,
      });
    });

    it("should throw an exception if creditConsumerID of WALLET_TRANSFER is same as current user", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transaction, transactionDTO } = getRandomTransaction(consumer.props.id, consumer.props.id);
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });
      const processedTransactionDTO: InitiateTransactionDTO = {
        ...transactionDTO,
        debitConsumerIDOrTag: consumer.props.id,
        creditAmount: transactionDTO.debitAmount,
        creditCurrency: transactionDTO.debitCurrency,
        exchangeRate: 1,
      };
      when(consumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);
      when(transactionRepo.createTransaction(anything())).thenResolve(transaction);
      when(workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_TRANSFER)).thenReturn(
        instance(walletTransferImpl),
      );
      when(walletTransferImpl.preprocessTransactionParams(deepEqual(transactionDTO), consumer.props.id)).thenResolve(
        processedTransactionDTO,
      );

      await expect(
        transactionService.initiateTransaction(transactionDTO, consumer.props.id, transaction.sessionKey),
      ).rejects.toThrowError(ServiceException);

      // IMPORTANT TO VERIFY THIS CORRECTLY :)
      expect(capture(transactionRepo.createTransaction)).toEqual({
        actions: [],
      });
    });

    it("should throw ServiceException if consumer is not found", async () => {
      const { transactionDTO } = getRandomTransaction("", "");
      await expect(transactionService.initiateTransaction(transactionDTO, "", null)).rejects.toThrowError(
        ServiceException,
      );
    });
  });

  describe("getTransactionQuote", () => {
    it("should return proper exchange rate calculations for conversion from USD to COP", async () => {
      when(workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_WITHDRAWAL)).thenReturn(
        instance(walletWithdrawalImpl),
      );

      when(walletWithdrawalImpl.getTransactionQuote(1, Currency.USD, Currency.COP, deepEqual([]))).thenResolve({
        nobaFee: "1.99",
        processingFee: "1.00",
        totalFee: "2.99",
        quoteAmount: "12.50",
        quoteAmountWithFees: "9.51",
        nobaRate: "0.00025",
      });

      const quote = await transactionService.getTransactionQuote(
        1,
        Currency.USD,
        Currency.COP,
        WorkflowName.WALLET_WITHDRAWAL,
        [],
      );

      expect(quote).toEqual({
        nobaFee: "1.99",
        processingFee: "1.00",
        totalFee: "2.99",
        quoteAmount: "12.50",
        quoteAmountWithFees: "9.51",
        nobaRate: "0.00025",
      });
    });

    it("should ensure only supported currencies are used", async () => {
      expect(async () => {
        await transactionService.getTransactionQuote(1, "XXX" as any, Currency.COP, WorkflowName.WALLET_WITHDRAWAL, []);
      }).rejects.toThrowError(ServiceException);

      expect(async () => {
        await transactionService.getTransactionQuote(1, Currency.USD, "XXX" as any, WorkflowName.WALLET_WITHDRAWAL, []);
      }).rejects.toThrowError(ServiceException);
    });
  });

  describe("addTransactionEvent", () => {
    it("should add a transaction event for the specified transaction with minimal parameters", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);

      const transactionEventToAdd: TransactionEventDTO = {
        message: "Test event",
      };

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: transaction.id,
        internal: true,
        message: transactionEventToAdd.message,
      };

      const timestamp = new Date();
      when(transactionRepo.addTransactionEvent(deepEqual(inputTransactionEvent))).thenResolve({
        ...inputTransactionEvent,
        id: "event-id",
        timestamp: timestamp,
      });

      const returnedTransactionEvent = await transactionService.addTransactionEvent(
        transaction.id,
        transactionEventToAdd,
      );

      expect(returnedTransactionEvent).toEqual({
        ...transactionEventToAdd,
        internal: true,
        timestamp: timestamp,
      });
    });

    it("should add a transaction event for the specified transaction with all parameters", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);

      const transactionEventToAdd: TransactionEventDTO = {
        message: "Test event",
        details: "This is a test event",
        internal: false,
        key: "EVENT_KEY",
        parameters: ["Param 1", "Param 2", "Param 3", "Param 4", "Param 5"],
      };

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: transaction.id,
        internal: transactionEventToAdd.internal,
        message: transactionEventToAdd.message,
        details: transactionEventToAdd.details,
        key: transactionEventToAdd.key,
        param1: transactionEventToAdd.parameters[0],
        param2: transactionEventToAdd.parameters[1],
        param3: transactionEventToAdd.parameters[2],
        param4: transactionEventToAdd.parameters[3],
        param5: transactionEventToAdd.parameters[4],
      };

      const timestamp = new Date();
      // TODO: Figure out why deepEqual(inputTransactionEvent) doesn't work here
      when(transactionRepo.addTransactionEvent(anything())).thenResolve({
        ...inputTransactionEvent,
        id: "event-id",
        timestamp: timestamp,
      });

      const returnedTransactionEvent = await transactionService.addTransactionEvent(
        transaction.id,
        transactionEventToAdd,
      );

      expect(returnedTransactionEvent).toEqual({
        ...transactionEventToAdd,
        timestamp: timestamp,
      });
    });

    it("should throw a ServiceException if the transaction doesn't exist", async () => {
      const transactionID = "transaction-1234";
      when(transactionRepo.getTransactionByID(transactionID)).thenResolve(null);

      expect(async () => await transactionService.addTransactionEvent(transactionID, anything())).rejects.toThrow(
        ServiceException,
      );
    });
  });

  describe("getTransactionEvents", () => {
    it("should retrieve transaction events for the specified transaction", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);

      const transactionEventToAdd: TransactionEventDTO = {
        message: "Test event",
      };

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: transaction.id,
        message: transactionEventToAdd.message,
      };

      when(transactionRepo.addTransactionEvent(deepEqual(inputTransactionEvent))).thenResolve({
        ...inputTransactionEvent,
        id: "event-id",
        timestamp: new Date(),
      });

      const timestamp = new Date();
      const internalTransactionEvent1: TransactionEvent = {
        id: "event-id-1",
        transactionID: transaction.id,
        timestamp: timestamp,
        message: "Test event internal",
        details: "This is an internal test event",
        internal: true,
        key: "EVENT_KEY_INTERNAL",
        param1: "Param 1",
        param2: "Param 2",
      };

      const internalTransactionEvent2: TransactionEvent = {
        id: "event-id-1-5",
        transactionID: transaction.id,
        timestamp: timestamp,
        message: "Test event internal 2",
        internal: true,
      };

      const externalTransactionEvent: TransactionEvent = {
        id: "event-id-2",
        transactionID: transaction.id,
        timestamp: timestamp,
        message: "Test event external",
        details: "This is an external test event",
        internal: false,
        key: "EVENT_KEY_EXTERNAL",
        param1: "Param 1",
        param2: "Param 2",
        param3: "Param 3",
        param4: "Param 4",
        param5: "Param 5",
      };

      // Include all events
      when(transactionRepo.getTransactionEvents(transaction.id, true)).thenResolve([
        internalTransactionEvent1,
        internalTransactionEvent2,
        externalTransactionEvent,
      ]);

      // Include only external events
      when(transactionRepo.getTransactionEvents(transaction.id, false)).thenResolve([externalTransactionEvent]);

      const returnedAllTransactionEvent = await transactionService.getTransactionEvents(transaction.id, true);
      const returnedExternalTransactionEvent = await transactionService.getTransactionEvents(transaction.id, false);

      expect(returnedAllTransactionEvent).toHaveLength(3);
      expect(returnedAllTransactionEvent[0]).toEqual(internalTransactionEvent1);
      expect(returnedAllTransactionEvent[1]).toEqual(internalTransactionEvent2);
      expect(returnedAllTransactionEvent[2]).toEqual(externalTransactionEvent);

      expect(returnedExternalTransactionEvent).toHaveLength(1);
      expect(returnedExternalTransactionEvent[0]).toEqual(externalTransactionEvent);
    });
  });

  describe("updateTransaction", () => {
    it("should update the status of an existing transaction", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);

      const updateTransactionDTO: UpdateTransactionDTO = {
        status: TransactionStatus.COMPLETED,
      };

      const updateTransaction: UpdateTransaction = {
        status: updateTransactionDTO.status,
      };

      when(transactionRepo.updateTransactionByTransactionID(transaction.id, deepEqual(updateTransaction))).thenResolve({
        ...transaction,
        status: updateTransactionDTO.status,
      });

      const updatedTransaction = await transactionService.updateTransaction(transaction.id, updateTransactionDTO);

      expect(updatedTransaction.status).toEqual(updateTransactionDTO.status);
    });
  });

  it("should throw a ServiceException if the transaction doesn't exist", async () => {
    const transactionID = "non-existient-transaction-id";
    when(transactionRepo.getTransactionByID(transactionID)).thenResolve(null);

    expect(async () => await transactionService.updateTransaction(transactionID, {})).rejects.toThrowError(
      ServiceException,
    );
  });

  describe("debitFromBank", () => {
    it("should debit from a bank account", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");

      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);
      const withdrawalDetails: WithdrawalDetails = {
        id: "fake-id",
        bankCode: "123",
        accountNumber: "1234",
        accountType: AccountType.SAVINGS,
        documentNumber: "1234",
        documentType: DocumentType.CC,
        transactionID: transaction.id,
      };
      when(withdrawalDetailsRepo.getWithdrawalDetailsByTransactionID(transaction.id)).thenResolve(withdrawalDetails);

      const debitFactoryRequest: DebitBankFactoryRequest = {
        amount: 100,
        currency: "USD",
        bankCode: withdrawalDetails.bankCode,
        accountNumber: withdrawalDetails.accountNumber,
        accountType: withdrawalDetails.accountType,
        documentNumber: withdrawalDetails.documentNumber,
        documentType: withdrawalDetails.documentType,
        transactionID: transaction.id,
        consumerID: transaction.debitConsumerID,
        transactionRef: transaction.transactionRef,
      };

      when(bankFactory.getBankImplementation(BankName.MONO)).thenReturn(instance(bankMonoImpl));

      const factoryResponse = {
        state: "SUCCESS",
        withdrawalID: "fake-withdrawal-id",
      };
      when(bankMonoImpl.debit(deepEqual(debitFactoryRequest))).thenResolve(factoryResponse);

      const debitRequest = {
        transactionID: transaction.id,
        amount: 100,
        currency: "USD",
        bankName: BankName.MONO,
      };
      expect(transactionService.debitFromBank(debitRequest)).resolves.toStrictEqual(factoryResponse);
    });

    it("should throw a ServiceException if the transaction doesn't exist", async () => {
      const transactionID = "non-existient-transaction-id";
      when(transactionRepo.getTransactionByID(transactionID)).thenResolve(null);
      when(withdrawalDetailsRepo.getWithdrawalDetailsByTransactionID(transactionID)).thenResolve(
        {} as WithdrawalDetails,
      );

      const debitRequest = {
        transactionID: transactionID,
        amount: 100,
        currency: "USD",
        bankName: BankName.MONO,
      };
      expect(transactionService.debitFromBank(debitRequest)).rejects.toThrowError(ServiceException);
    });

    it("should throw a ServiceException if the withdrawal details don't exist", async () => {
      const transactionID = "non-existient-transaction-id";
      when(transactionRepo.getTransactionByID(transactionID)).thenResolve({} as Transaction);
      when(withdrawalDetailsRepo.getWithdrawalDetailsByTransactionID(transactionID)).thenResolve(null);

      const debitRequest = {
        transactionID: transactionID,
        amount: 100,
        currency: "USD",
        bankName: BankName.MONO,
      };
      expect(transactionService.debitFromBank(debitRequest)).rejects.toThrowError(ServiceException);
    });
  });

  describe("getWithdrawalDetails", () => {
    it("should return withdrawal details", async () => {
      const withdrawalDetails: WithdrawalDetails = {
        id: "fake-id",
        bankCode: "123",
        accountNumber: "1234",
        accountType: AccountType.SAVINGS,
        documentNumber: "1234",
        documentType: DocumentType.CC,
        transactionID: "faket-transaction",
      };
      when(withdrawalDetailsRepo.getWithdrawalDetailsByTransactionID("fake-transaction")).thenResolve(
        withdrawalDetails,
      );

      const response = await transactionService.getWithdrawalDetails("fake-transaction");
      expect(response).toStrictEqual(withdrawalDetails);
    });
  });

  describe("addWithdrawalDetails", () => {
    it("adds withdrawal details", async () => {
      const inputDetails: InputWithdrawalDetails = {
        bankCode: "123",
        accountNumber: "1234",
        accountType: AccountType.SAVINGS,
        documentNumber: "1234",
        documentType: DocumentType.CC,
        transactionID: "faket-transaction",
      };

      const withdrawalDetails: WithdrawalDetails = {
        ...inputDetails,
        id: "fake-id",
      };

      when(withdrawalDetailsRepo.addWithdrawalDetails(deepEqual(inputDetails))).thenResolve(withdrawalDetails);

      const response = await transactionService.addWithdrawalDetails(inputDetails);
      expect(response).toStrictEqual(withdrawalDetails);
    });
  });
});

const getUSDCOPExchangeRate = (): ExchangeRateDTO => {
  return {
    numeratorCurrency: Currency.USD,
    denominatorCurrency: Currency.COP,
    bankRate: 1,
    nobaRate: 1,
    expirationTimestamp: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
  };
};

const getCOPUSDExchangeRate = (): ExchangeRateDTO => {
  return {
    numeratorCurrency: Currency.COP,
    denominatorCurrency: Currency.USD,
    bankRate: 1,
    nobaRate: 1,
  };
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
  creditConsumerID: string,
): { transaction: Transaction; transactionDTO: InitiateTransactionDTO; inputTransaction: InputTransaction } => {
  const transaction: Transaction = {
    transactionRef: Utils.generateLowercaseUUID(true),
    exchangeRate: 1,
    status: TransactionStatus.INITIATED,
    workflowName: WorkflowName.WALLET_TRANSFER,
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
  };

  const inputTransaction: InputTransaction = {
    transactionRef: transaction.transactionRef,
    workflowName: transaction.workflowName,
    exchangeRate: transaction.exchangeRate,
    memo: transaction.memo,
    sessionKey: transaction.sessionKey,
  };

  transaction.debitAmount = 100;
  transaction.debitCurrency = "USD";
  transaction.debitConsumerID = debitConsumerID;
  transaction.creditConsumerID = creditConsumerID;

  transactionDTO.debitAmount = transaction.debitAmount;
  transactionDTO.debitCurrency = Currency.USD;
  transactionDTO.creditConsumerIDOrTag = transaction.creditConsumerID;

  inputTransaction.debitAmount = transaction.debitAmount;
  inputTransaction.debitCurrency = transaction.debitCurrency;
  inputTransaction.debitConsumerID = transaction.debitConsumerID;
  inputTransaction.creditConsumerID = transaction.creditConsumerID;
  inputTransaction.creditAmount = transaction.debitAmount;
  inputTransaction.creditCurrency = transaction.debitCurrency;

  return { transaction, transactionDTO, inputTransaction };
};
