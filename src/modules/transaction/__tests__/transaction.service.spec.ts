import { Test, TestingModule } from "@nestjs/testing";
import { AppEnvironment, NOBA_CONFIG_KEY, SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
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
import { anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { TransactionService } from "../transaction.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { Currency } from "../domain/TransactionTypes";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { Utils } from "../../../core/utils/Utils";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { TransactionEventDTO } from "../dto/TransactionEventDTO";
import { InputTransactionEvent, TransactionEvent } from "../domain/TransactionEvent";
import { UpdateTransactionDTO } from "../dto/TransactionDTO";
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
import { FeeType } from "../domain/TransactionFee";
import { ConsumerVerificationResult } from "../../../modules/verification/domain/VerificationResult";
import { TransactionVerification } from "../../../modules/verification/domain/TransactionVerification";
import { SeverityLevel } from "../../../core/exception/base.exception";
import { getMockMonoWorkflowServiceWithDefaults } from "../../mono/workflow/mocks/mock.mono.workflow.service";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { EmployerService } from "../../../modules/employer/employer.service";
import { getMockEmployeeRepoWithDefaults } from "../../../modules/employee/mocks/mock.employee.repo";
import { getMockEmployerServiceWithDefaults } from "../../../modules/employer/mocks/mock.employer.service";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";
import { Employee } from "../../../modules/employee/domain/Employee";
import { uuid } from "uuidv4";
import { getRandomEmployee } from "../../../modules/employee/test_utils/employee.test.utils";
import { Payroll } from "../../../modules/employer/domain/Payroll";
import {
  getRandomPayroll,
  getRandomPayrollDisbursement,
} from "../../../modules/employer/test_utils/payroll.test.utils";
import { PayrollDisbursement } from "../../../modules/employer/domain/PayrollDisbursement";
import { AlertService } from "../../../modules/common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../modules/common/mocks/mock.alert.service";
import { KYCStatus } from "@prisma/client";
import { getRandomEmployer } from "../../../modules/employer/test_utils/employer.test.utils";
import { Employer } from "../../../modules/employer/domain/Employer";
import { KmsService } from "../../../modules/common/kms.service";
import { getMockKMSServiceWithDefaults } from "../../../modules/common/mocks/mock.kms.service";
import { KmsKeyType } from "../../../config/configtypes/KmsConfigs";
import { TransactionFilterOptionsDTO } from "../dto/TransactionFilterOptionsDTO";
import { CardReversalTransactionType, InitiateTransactionRequest } from "../dto/transaction.service.dto";
import { ExchangeRateService } from "../../../modules/exchangerate/exchangerate.service";
import { getMockExchangeRateServiceWithDefaults } from "../../../modules/exchangerate/mocks/mock.exchangerate.service";
import { ExchangeRateDTO } from "../../../modules/exchangerate/dto/exchangerate.dto";
import { MonoService } from "../../../modules/mono/public/mono.service";
import { getMockMonoServiceWithDefaults } from "../../../modules/mono/public/mocks/mock.mono.service";
import { CreditAdjustmentImpl } from "../factory/credit.adjustment.impl";
import { getMockCreditAdjustmentImplWithDefaults } from "../mocks/mock.credit.adjustment.impl";
import { getMockDebitAdjustmentImplWithDefaults } from "../mocks/mock.dedit.adjustment.impl";
import { DebitAdjustmentImpl } from "../factory/debit.adjustment.impl";
import { ConsumerWorkflowName } from "../../../infra/temporal/workflow";
import { TransactionPreprocessorFactory } from "../factory/preprocessors/transaction.preprocessor.factory";
import { getMockTransactionPreprocessorFactoryWithDefaults } from "../factory/preprocessors/mocks/mock.transaction.preprocessor.factory";

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
  let creditAdjustmentImpl: CreditAdjustmentImpl;
  let debitAdjustmentImpl: DebitAdjustmentImpl;
  let bankFactory: BankFactory;
  let monoService: MonoService;
  let withdrawalDetailsRepo: IWithdrawalDetailsRepo;
  let employeeService: EmployeeService;
  let employerService: EmployerService;
  let alertService: AlertService;
  let kmsService: KmsService;
  let transactionPreprocessorFactory: TransactionPreprocessorFactory;

  beforeEach(async () => {
    transactionRepo = getMockTransactionRepoWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    verificationService = getMockVerificationServiceWithDefaults();
    exchangeRateService = getMockExchangeRateServiceWithDefaults();
    workflowFactory = getMockWorkflowFactoryWithDefaults();
    walletTransferImpl = getMockWalletTransferImplWithDefaults();
    walletWithdrawalImpl = getMockWalletWithdrawalImplWithDefaults();
    walletDepositImpl = getMockWalletDepositImplWithDefaults();
    creditAdjustmentImpl = getMockCreditAdjustmentImplWithDefaults();
    debitAdjustmentImpl = getMockDebitAdjustmentImplWithDefaults();
    bankFactory = getMockBankFactoryWithDefaults();
    monoService = getMockMonoServiceWithDefaults();
    withdrawalDetailsRepo = getMockWithdrawalDetailsRepoWithDefaults();
    employeeService = getMockEmployeeServiceWithDefaults();
    employerService = getMockEmployerServiceWithDefaults();
    alertService = getMockAlertServiceWithDefaults();
    kmsService = getMockKMSServiceWithDefaults();
    transactionPreprocessorFactory = getMockTransactionPreprocessorFactoryWithDefaults();

    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
      [NOBA_CONFIG_KEY]: {
        environment: AppEnvironment.DEV,
      },
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
          provide: MonoService,
          useFactory: () => instance(monoService),
        },
        {
          provide: EmployeeService,
          useFactory: () => instance(employeeService),
        },
        {
          provide: EmployerService,
          useFactory: () => instance(employerService),
        },
        {
          provide: WITHDRAWAL_DETAILS_REPO_PROVIDER,
          useFactory: () => instance(withdrawalDetailsRepo),
        },
        {
          provide: AlertService,
          useFactory: () => instance(alertService),
        },
        {
          provide: KmsService,
          useFactory: () => instance(kmsService),
        },
        {
          provide: TransactionPreprocessorFactory,
          useFactory: () => instance(transactionPreprocessorFactory),
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

    it("should succeed if transaction is found but consumer is not passed", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByTransactionRef(transaction.transactionRef)).thenResolve(transaction);

      const returnedTransaction = await transactionService.getTransactionByTransactionRef(transaction.transactionRef);
      expect(returnedTransaction).toEqual(transaction);
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

  describe("getFilteredTransactions", () => {
    it("should return the transaction if the transactionID matches", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      const filter: TransactionFilterOptionsDTO = {
        consumerID: "consumerID",
        creditCurrency: "USD",
        debitCurrency: "COP",
        endDate: "2030-12-31",
        startDate: "2022-01-01",
        pageLimit: 10,
        pageOffset: 0,
        transactionStatus: TransactionStatus.COMPLETED,
      };

      const result = {
        items: [transaction],
        totalItems: 1,
        page: 1,
        hasNextPage: false,
        totalPages: 1,
      };

      when(transactionRepo.getFilteredTransactions(filter)).thenResolve(result);

      const returnedResult = await transactionService.getFilteredTransactions(filter);
      expect(returnedResult).toStrictEqual(result);
    });

    it("should return 'null' if the transaction is not found", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(null);

      const returnedTransaction = await transactionService.getTransactionByTransactionID(transaction.id);
      expect(returnedTransaction).toBeNull();
    });
  });

  describe("deprecatedInitiateTransaction", () => {
    it("should initiate a WALLET_TRANSFER transaction", async () => {
      const consumer = getRandomConsumer("consumerID");
      const consumer2 = getRandomConsumer("consumerID2");
      const { transaction, transactionDTO, inputTransaction } = getRandomTransaction(
        consumer.props.id,
        consumer2.props.id,
      );
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });

      when(consumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getActiveConsumer(consumer2.props.id)).thenResolve(consumer2);
      when(transactionRepo.createTransaction(anything())).thenResolve(transaction);
      when(workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_TRANSFER)).thenReturn(
        instance(walletTransferImpl),
      );
      when(walletTransferImpl.preprocessTransactionParams(deepEqual(transactionDTO), consumer.props.id)).thenResolve(
        inputTransaction,
      );
      when(walletTransferImpl.initiateWorkflow(deepEqual(transaction))).thenResolve();

      const returnedTransaction = await transactionService.deprecatedInitiateTransaction(
        transactionDTO,
        consumer.props.id,
        transaction.sessionKey,
      );

      expect(returnedTransaction).toEqual(transaction);

      // IMPORTANT TO VERIFY THIS CORRECTLY :)
      const [propagatedTransactionToSave] = capture(transactionRepo.createTransaction).last();
      expect(propagatedTransactionToSave).toStrictEqual({
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
        transactionFees: [
          {
            amount: 1,
            currency: "USD",
            type: "PROCESSING",
          },
        ],
      });
    });

    it("should fail to validate against the IDV provider, write a TransactionEvent, and move to FAILED", async () => {
      const consumer = getRandomConsumer("consumerID");
      const consumer2 = getRandomConsumer("consumerID2");
      const { transaction, transactionDTO, inputTransaction } = getRandomTransaction(
        consumer.props.id,
        consumer2.props.id,
      );
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });

      when(consumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getActiveConsumer(consumer2.props.id)).thenResolve(consumer2);
      when(transactionRepo.createTransaction(anything())).thenResolve(transaction);
      when(workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_TRANSFER)).thenReturn(
        instance(walletTransferImpl),
      );
      when(walletTransferImpl.preprocessTransactionParams(deepEqual(transactionDTO), consumer.props.id)).thenResolve(
        inputTransaction,
      );
      when(walletTransferImpl.initiateWorkflow(deepEqual(transaction))).thenResolve();

      const verificationResult: ConsumerVerificationResult = {
        status: "FAILED" as any,
      };
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      const transactionVerification: TransactionVerification = {
        transactionRef: transaction.transactionRef,
        debitConsumerID: transaction.debitConsumerID,
        creditConsumerID: transaction.creditConsumerID,
        workflowName: transaction.workflowName,
        debitAmount: transaction.debitAmount,
        debitCurrency: transaction.debitCurrency,
        creditAmount: transaction.creditAmount,
        creditCurrency: transaction.creditCurrency,
      };
      when(
        verificationService.transactionVerification(
          transaction.sessionKey,
          consumer,
          deepEqual(transactionVerification),
        ),
      ).thenResolve(verificationResult);

      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);

      const transactionEventToAdd: TransactionEventDTO = {
        message: "Transaction has been determined to be high risk",
        details: `Result: "FAILED"`,
        internal: true,
      };

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: transaction.id,
        internal: transactionEventToAdd.internal,
        message: transactionEventToAdd.message,
        details: transactionEventToAdd.details,
      };

      const timestamp = new Date();
      when(transactionRepo.addTransactionEvent(deepEqual(inputTransactionEvent))).thenResolve({
        ...inputTransactionEvent,
        id: "event-id",
        timestamp: timestamp,
      });

      when(
        transactionRepo.updateTransactionByTransactionID(
          transaction.id,
          deepEqual({
            status: TransactionStatus.FAILED,
          }),
        ),
      ).thenResolve();

      expect(async () => {
        await transactionService.deprecatedInitiateTransaction(
          transactionDTO,
          consumer.props.id,
          transaction.sessionKey,
        );
      }).rejects.toThrow(ServiceException);
    });

    it("should get an error from IDV provider, write a TransactionEvent, and move to FAILED", async () => {
      const consumer = getRandomConsumer("consumerID");
      const consumer2 = getRandomConsumer("consumerID2");
      const { transaction, transactionDTO, inputTransaction } = getRandomTransaction(
        consumer.props.id,
        consumer2.props.id,
      );
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });

      when(consumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getActiveConsumer(consumer2.props.id)).thenResolve(consumer2);
      when(transactionRepo.createTransaction(anything())).thenResolve(transaction);
      when(workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_TRANSFER)).thenReturn(
        instance(walletTransferImpl),
      );
      when(walletTransferImpl.preprocessTransactionParams(deepEqual(transactionDTO), consumer.props.id)).thenResolve(
        inputTransaction,
      );
      when(walletTransferImpl.initiateWorkflow(deepEqual(transaction))).thenResolve();

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      const transactionVerification: TransactionVerification = {
        transactionRef: transaction.transactionRef,
        debitConsumerID: transaction.debitConsumerID,
        creditConsumerID: transaction.creditConsumerID,
        workflowName: transaction.workflowName,
        debitAmount: transaction.debitAmount,
        debitCurrency: transaction.debitCurrency,
        creditAmount: transaction.creditAmount,
        creditCurrency: transaction.creditCurrency,
      };
      when(
        verificationService.transactionVerification(
          transaction.sessionKey,
          consumer,
          deepEqual(transactionVerification),
        ),
      ).thenThrow(
        new ServiceException({
          message: "Sardine request failed",
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          severity: SeverityLevel.HIGH,
        }),
      );

      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);

      const transactionEventToAdd: TransactionEventDTO = {
        message: "Error performing transaction verification",
        details: `Sardine request failed`,
        internal: true,
      };

      const inputTransactionEvent: InputTransactionEvent = {
        transactionID: transaction.id,
        internal: transactionEventToAdd.internal,
        message: transactionEventToAdd.message,
        details: transactionEventToAdd.details,
      };

      const timestamp = new Date();
      when(transactionRepo.addTransactionEvent(deepEqual(inputTransactionEvent))).thenResolve({
        ...inputTransactionEvent,
        id: "event-id",
        timestamp: timestamp,
      });

      when(
        transactionRepo.updateTransactionByTransactionID(
          transaction.id,
          deepEqual({
            status: TransactionStatus.FAILED,
          }),
        ),
      ).thenResolve();

      expect(async () => {
        await transactionService.deprecatedInitiateTransaction(
          transactionDTO,
          consumer.props.id,
          transaction.sessionKey,
        );
      }).rejects.toThrow(ServiceException);
    });

    it("should add optional withdrawal details to repo during transaction", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transaction, transactionDTO, inputTransaction } = getRandomTransaction(
        consumer.props.id,
        undefined,
        WorkflowName.WALLET_WITHDRAWAL,
      );
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });

      when(consumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);
      when(transactionRepo.createTransaction(anything())).thenResolve(transaction);
      when(
        withdrawalDetailsRepo.addWithdrawalDetails(
          deepEqual({
            transactionID: transaction.id,
            ...transactionDTO.withdrawalData,
          }),
        ),
      ).thenResolve({
        ...transactionDTO.withdrawalData,
        transactionID: transaction.id,
        id: v4(),
      });
      when(workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_WITHDRAWAL)).thenReturn(
        instance(walletWithdrawalImpl),
      );

      when(walletWithdrawalImpl.preprocessTransactionParams(deepEqual(transactionDTO), consumer.props.id)).thenResolve(
        inputTransaction,
      );
      when(walletWithdrawalImpl.initiateWorkflow(deepEqual(transaction))).thenResolve();

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

      when(
        verificationService.transactionVerification(transaction.sessionKey, consumer, deepEqual(anything())),
      ).thenResolve({
        status: KYCStatus.APPROVED,
      });

      const returnedTransaction = await transactionService.deprecatedInitiateTransaction(
        transactionDTO,
        consumer.props.id,
        transaction.sessionKey,
      );

      expect(returnedTransaction).toEqual(transaction);
      verify(kmsService.decryptString(transactionDTO.withdrawalData.accountNumber, KmsKeyType.SSN)).once();
      const [propagatedTransactionToSave] = capture(transactionRepo.createTransaction).last();
      expect(propagatedTransactionToSave).toEqual({
        transactionRef: transaction.transactionRef,
        workflowName: "WALLET_WITHDRAWAL",
        debitConsumerID: "consumerID",
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        debitCurrency: "USD",
        creditCurrency: "COP",
        exchangeRate: 1,
        sessionKey: transaction.sessionKey,
        memo: transaction.memo,
        transactionFees: [
          {
            amount: 1,
            currency: "USD",
            type: "PROCESSING",
          },
        ],
      });
    });

    it("should handle gracefully if no withdrawal details are present", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transaction, transactionDTO, inputTransaction } = getRandomTransaction(
        consumer.props.id,
        undefined,
        WorkflowName.WALLET_WITHDRAWAL,
      );
      transactionDTO.withdrawalData = undefined;
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });

      when(consumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);
      when(transactionRepo.createTransaction(anything())).thenResolve(transaction);
      when(workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_WITHDRAWAL)).thenReturn(
        instance(walletWithdrawalImpl),
      );

      when(walletWithdrawalImpl.preprocessTransactionParams(deepEqual(transactionDTO), consumer.props.id)).thenResolve(
        inputTransaction,
      );
      when(walletWithdrawalImpl.initiateWorkflow(deepEqual(transaction))).thenResolve();

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

      when(
        verificationService.transactionVerification(transaction.sessionKey, consumer, deepEqual(anything())),
      ).thenResolve({
        status: KYCStatus.APPROVED,
      });

      const returnedTransaction = await transactionService.deprecatedInitiateTransaction(
        transactionDTO,
        consumer.props.id,
        transaction.sessionKey,
      );

      expect(returnedTransaction).toEqual(transaction);
      verify(kmsService.decryptString(anything(), anything())).never();
      verify(withdrawalDetailsRepo.addWithdrawalDetails(anything())).never();
      const [propagatedTransactionToSave] = capture(transactionRepo.createTransaction).last();
      expect(propagatedTransactionToSave).toEqual({
        transactionRef: transaction.transactionRef,
        workflowName: "WALLET_WITHDRAWAL",
        debitConsumerID: "consumerID",
        debitAmount: transaction.debitAmount,
        creditAmount: transaction.creditAmount,
        debitCurrency: "USD",
        creditCurrency: "COP",
        exchangeRate: 1,
        sessionKey: transaction.sessionKey,
        memo: transaction.memo,
        transactionFees: [
          {
            amount: 1,
            currency: "USD",
            type: "PROCESSING",
          },
        ],
      });
    });

    it("should throw an exception if creditConsumerID of WALLET_TRANSFER is same as current user", async () => {
      const consumer = getRandomConsumer("consumerID");
      const { transaction, transactionDTO, inputTransaction } = getRandomTransaction(
        consumer.props.id,
        consumer.props.id,
      );
      jest.spyOn(Utils, "generateLowercaseUUID").mockImplementationOnce(() => {
        return transaction.transactionRef;
      });

      when(consumerService.getActiveConsumer(consumer.props.id)).thenResolve(consumer);
      when(transactionRepo.createTransaction(anything())).thenResolve(transaction);
      when(workflowFactory.getWorkflowImplementation(WorkflowName.WALLET_TRANSFER)).thenReturn(
        instance(walletTransferImpl),
      );
      when(walletTransferImpl.preprocessTransactionParams(deepEqual(transactionDTO), consumer.props.id)).thenResolve(
        inputTransaction,
      );

      await expect(
        transactionService.deprecatedInitiateTransaction(transactionDTO, consumer.props.id, transaction.sessionKey),
      ).rejects.toThrowError(ServiceException);

      // IMPORTANT TO VERIFY THIS CORRECTLY :)
      expect(capture(transactionRepo.createTransaction)).toEqual({
        actions: [],
      });
    });

    it("should throw ServiceException if consumer is not found", async () => {
      const { transactionDTO } = getRandomTransaction("", "");
      await expect(transactionService.deprecatedInitiateTransaction(transactionDTO, "", null)).rejects.toThrowError(
        ServiceException,
      );
    });
  });

  describe("initiateTransaction", () => {
    describe("CREDIT_ADJUSTMENT", () => {
      describe("validation errors", () => {
        const validateAndSaveTransactionRequest: InitiateTransactionRequest = {
          type: WorkflowName.CREDIT_ADJUSTMENT,
          creditAdjustmentRequest: {
            creditAmount: 100,
            creditCurrency: Currency.COP,
            creditConsumerID: "CREDIT_CONSUMER_ID",
            memo: "MEMO",
          },
        };

        it.each(["creditAmount", "creditCurrency", "creditConsumerID", "memo"])(
          "should throw error if '%s' is not specified",
          async field => {
            const request = JSON.parse(JSON.stringify(validateAndSaveTransactionRequest));
            delete request["creditAdjustmentRequest"][field];

            try {
              await transactionService.initiateTransaction(request);
              expect(true).toBe(false);
            } catch (err) {
              expect(err.message).toEqual(expect.stringContaining("creditAdjustmentRequest"));
              expect(err.message).toEqual(expect.stringContaining(`${field}`));
            }
          },
        );

        it.each(["creditCurrency"])("should throw error if '%s' has INVALID value", async field => {
          const request = JSON.parse(JSON.stringify(validateAndSaveTransactionRequest));
          request["creditAdjustmentRequest"][field] = "INVALID";

          try {
            await transactionService.initiateTransaction(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining("creditAdjustmentRequest"));
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        });
      });

      it("should correctly save the CREDIT_ADJUSTMENT transaction", async () => {
        const request: InitiateTransactionRequest = {
          type: WorkflowName.CREDIT_ADJUSTMENT,
          creditAdjustmentRequest: {
            creditAmount: 100,
            creditCurrency: Currency.COP,
            creditConsumerID: "CREDIT_CONSUMER_ID",
            memo: "MEMO",
          },
        };
        const transaction: Transaction = {
          id: "NOBA_TRANSACTION_ID",
          transactionRef: "DUMMY_REF",
          creditAmount: 100,
          creditCurrency: Currency.COP,
          creditConsumerID: "CREDIT_CONSUMER_ID",
          transactionFees: [],
          exchangeRate: 1,
          sessionKey: WorkflowName.CREDIT_ADJUSTMENT,
          status: TransactionStatus.INITIATED,
          workflowName: WorkflowName.CREDIT_ADJUSTMENT,
        };
        when(transactionRepo.createTransaction(anything())).thenResolve(transaction);
        when(workflowFactory.getWorkflowImplementation(WorkflowName.CREDIT_ADJUSTMENT)).thenReturn(
          instance(creditAdjustmentImpl),
        );
        when(creditAdjustmentImpl.initiateWorkflow(deepEqual(transaction))).thenResolve();

        const response = await transactionService.initiateTransaction(request);

        expect(response).toStrictEqual(transaction);
        const [propagatedInputTransactionArg] = capture(transactionRepo.createTransaction).last();
        expect(propagatedInputTransactionArg).toStrictEqual({
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

    describe("DEBIT_ADJUSTMENT", () => {
      describe("validation errors", () => {
        const validateAndSaveTransactionRequest: InitiateTransactionRequest = {
          type: WorkflowName.DEBIT_ADJUSTMENT,
          debitAdjustmentRequest: {
            debitAmount: 100,
            debitCurrency: Currency.COP,
            debitConsumerID: "DEBIT_CONSUMER_ID",
            memo: "MEMO",
          },
        };

        it.each(["debitAmount", "debitCurrency", "debitConsumerID", "memo"])(
          "should throw error if '%s' is not specified",
          async field => {
            const request = JSON.parse(JSON.stringify(validateAndSaveTransactionRequest));
            delete request["debitAdjustmentRequest"][field];

            try {
              await transactionService.initiateTransaction(request);
              expect(true).toBe(false);
            } catch (err) {
              expect(err.message).toEqual(expect.stringContaining("debitAdjustmentRequest"));
              expect(err.message).toEqual(expect.stringContaining(`${field}`));
            }
          },
        );

        it.each(["debitCurrency"])("should throw error if '%s' has INVALID value", async field => {
          const request = JSON.parse(JSON.stringify(validateAndSaveTransactionRequest));
          request["debitAdjustmentRequest"][field] = "INVALID";

          try {
            await transactionService.initiateTransaction(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining("debitAdjustmentRequest"));
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        });
      });

      it("should correctly save the DEBIT_ADJUSTMENT transaction", async () => {
        const request: InitiateTransactionRequest = {
          type: WorkflowName.DEBIT_ADJUSTMENT,
          debitAdjustmentRequest: {
            debitAmount: 100,
            debitCurrency: Currency.COP,
            debitConsumerID: "DEBIT_CONSUMER_ID",
            memo: "MEMO",
          },
        };
        const transaction: Transaction = {
          id: "NOBA_TRANSACTION_ID",
          transactionRef: "DUMMY_REF",
          debitAmount: 100,
          debitCurrency: Currency.COP,
          debitConsumerID: "DEBIT_CONSUMER_ID",
          transactionFees: [],
          exchangeRate: 1,
          sessionKey: WorkflowName.DEBIT_ADJUSTMENT,
          status: TransactionStatus.INITIATED,
          workflowName: WorkflowName.DEBIT_ADJUSTMENT,
        };
        when(transactionRepo.createTransaction(anything())).thenResolve(transaction);
        when(workflowFactory.getWorkflowImplementation(WorkflowName.DEBIT_ADJUSTMENT)).thenReturn(
          instance(debitAdjustmentImpl),
        );
        when(debitAdjustmentImpl.initiateWorkflow(deepEqual(transaction))).thenResolve();

        const response = await transactionService.initiateTransaction(request);

        expect(response).toStrictEqual(transaction);
        const [propagatedInputTransactionArg] = capture(transactionRepo.createTransaction).last();
        expect(propagatedInputTransactionArg).toStrictEqual({
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
  });

  describe("validateAndSaveTransaction", () => {
    it.each([
      WorkflowName.PAYROLL_PROCESSING,
      WorkflowName.WALLET_DEPOSIT,
      WorkflowName.WALLET_WITHDRAWAL,
      WorkflowName.WALLET_TRANSFER,
    ])("should throw error if 'type' is '%s'", async workflow => {
      try {
        await transactionService.validateAndSaveTransaction({ type: workflow });
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.errorCode).toBe(ServiceErrorCode.NOT_IMPLEMENTED);
      }
    });

    it("should throw error if none of the 'request' sub-object are set", async () => {
      const request: InitiateTransactionRequest = {
        type: WorkflowName.CARD_WITHDRAWAL,
      };
      try {
        await transactionService.validateAndSaveTransaction(request);
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toEqual(expect.stringContaining("at least one of"));
        expect(err.message).toEqual(expect.stringContaining("cardWithdrawalRequest"));
      }
    });

    // TODO: This tests should be moved along with the introduction of Inheritance hierarchy.
    describe("CARD_WITHDRAWAL", () => {
      describe("validation errors", () => {
        const validateAndSaveTransactionRequest: InitiateTransactionRequest = {
          type: WorkflowName.CARD_WITHDRAWAL,
          cardWithdrawalRequest: {
            debitAmountInUSD: 100,
            creditAmount: 100,
            creditCurrency: Currency.COP,
            debitConsumerID: "DEBIT_CONSUMER_ID",
            exchangeRate: 1,
            memo: "MEMO",
            nobaTransactionID: "NOBA_TRANSACTION_ID",
          },
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
          const request = JSON.parse(JSON.stringify(validateAndSaveTransactionRequest));
          delete request["cardWithdrawalRequest"][field];

          try {
            await transactionService.validateAndSaveTransaction(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining("cardWithdrawalRequest"));
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        });

        it.each(["creditCurrency"])("should throw error if '%s' has INVALID value", async field => {
          const request = JSON.parse(JSON.stringify(validateAndSaveTransactionRequest));
          request["cardWithdrawalRequest"][field] = "INVALID";

          try {
            await transactionService.validateAndSaveTransaction(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining("cardWithdrawalRequest"));
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        });
      });

      it("should correctly save the CARD_WITHDRAWAL transaction", async () => {
        const request: InitiateTransactionRequest = {
          type: WorkflowName.CARD_WITHDRAWAL,
          cardWithdrawalRequest: {
            debitAmountInUSD: 100,
            creditAmount: 100,
            creditCurrency: Currency.COP,
            debitConsumerID: "DEBIT_CONSUMER_ID",
            exchangeRate: 1,
            memo: "MEMO",
            nobaTransactionID: "NOBA_TRANSACTION_ID",
          },
        };
        const transaction: Transaction = {
          id: "NOBA_TRANSACTION_ID",
          transactionRef: "DUMMY_REF",
          exchangeRate: 1,
          debitAmount: 100,
          debitCurrency: Currency.USD,
          debitConsumerID: "DEBIT_CONSUMER_ID",
          creditAmount: 100,
          creditCurrency: Currency.COP,
          transactionFees: [],
          sessionKey: "CARD_WITHDRAWAL",
          status: TransactionStatus.INITIATED,
          workflowName: WorkflowName.CARD_WITHDRAWAL,
        };
        when(transactionRepo.createTransaction(anything())).thenResolve(transaction);

        const response = await transactionService.validateAndSaveTransaction(request);

        expect(response).toStrictEqual(transaction);
        const [propagatedInputTransactionArg] = capture(transactionRepo.createTransaction).last();
        expect(propagatedInputTransactionArg).toStrictEqual({
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

    describe("CARD_REVERSAL", () => {
      const validCardReversalCreditRequest: InitiateTransactionRequest = {
        type: WorkflowName.CARD_REVERSAL,
        cardReversalRequest: {
          type: CardReversalTransactionType.CREDIT,
          amountInUSD: 100,
          consumerID: "CREDIT_CONSUMER_ID",
          exchangeRate: 1,
          memo: "MEMO",
          nobaTransactionID: "NOBA_TRANSACTION_ID",
        },
      };
      const validCardReversalDebitRequest: InitiateTransactionRequest = {
        type: WorkflowName.CARD_REVERSAL,
        cardReversalRequest: {
          type: CardReversalTransactionType.DEBIT,
          amountInUSD: 100,
          consumerID: "DEBIT_CONSUMER_ID",
          exchangeRate: 1,
          memo: "MEMO",
          nobaTransactionID: "NOBA_TRANSACTION_ID",
        },
      };

      describe("validation errors", () => {
        it.each(["type", "nobaTransactionID", "consumerID", "amountInUSD", "exchangeRate", "memo"])(
          "should throw error if '%s' is not specified",
          async field => {
            const request = JSON.parse(JSON.stringify(validCardReversalCreditRequest));
            delete request["cardReversalRequest"][field];

            try {
              await transactionService.validateAndSaveTransaction(request);
              expect(true).toBe(false);
            } catch (err) {
              expect(err.message).toEqual(expect.stringContaining("cardReversalRequest"));
              expect(err.message).toEqual(expect.stringContaining(`${field}`));
            }
          },
        );

        it("should throw error if 'type' field is invalid", async () => {
          const request = JSON.parse(JSON.stringify(validCardReversalCreditRequest));
          request["cardReversalRequest"]["type"] = "INVALID";

          try {
            await transactionService.validateAndSaveTransaction(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining("cardReversalRequest"));
            expect(err.message).toEqual(expect.stringContaining("type"));
          }
        });
      });

      describe("success scenarios", () => {
        it("should correctly save the CARD_REVERSAL 'credit' transaction", async () => {
          const request: InitiateTransactionRequest = JSON.parse(JSON.stringify(validCardReversalCreditRequest));
          const transaction: Transaction = {
            id: "NOBA_TRANSACTION_ID",
            transactionRef: "DUMMY_REF",
            exchangeRate: 1,
            creditAmount: 100,
            creditCurrency: Currency.USD,
            creditConsumerID: "CREDIT_CONSUMER_ID",
            transactionFees: [],
            sessionKey: "CARD_REVERSAL",
            status: TransactionStatus.INITIATED,
            workflowName: WorkflowName.CARD_REVERSAL,
          };
          when(transactionRepo.createTransaction(anything())).thenResolve(transaction);

          const response = await transactionService.validateAndSaveTransaction(request);

          expect(response).toStrictEqual(transaction);
          const [propagatedInputTransactionArg] = capture(transactionRepo.createTransaction).last();
          expect(propagatedInputTransactionArg).toStrictEqual({
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

        it("should correctly save the CARD_REVERSAL 'debit' transaction", async () => {
          const request: InitiateTransactionRequest = JSON.parse(JSON.stringify(validCardReversalDebitRequest));
          const transaction: Transaction = {
            id: "NOBA_TRANSACTION_ID",
            transactionRef: "DUMMY_REF",
            exchangeRate: 1,
            debitAmount: 100,
            debitCurrency: Currency.USD,
            debitConsumerID: "DEBIT_CONSUMER_ID",
            transactionFees: [],
            sessionKey: "CARD_REVERSAL",
            status: TransactionStatus.INITIATED,
            workflowName: WorkflowName.CARD_REVERSAL,
          };
          when(transactionRepo.createTransaction(anything())).thenResolve(transaction);

          const response = await transactionService.validateAndSaveTransaction(request);

          expect(response).toStrictEqual(transaction);
          const [propagatedInputTransactionArg] = capture(transactionRepo.createTransaction).last();
          expect(propagatedInputTransactionArg).toStrictEqual({
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

    describe("PAYROLL_DEPOSIT", () => {
      describe("validation errors", () => {
        const validateAndSaveTransactionRequest: InitiateTransactionRequest = {
          type: WorkflowName.PAYROLL_DEPOSIT,
          payrollDepositRequest: {
            disbursementID: "DISBURSEMENT_ID",
          },
        };

        it.each(["disbursementID"])("should throw error if '%s' is not specified", async field => {
          const request = JSON.parse(JSON.stringify(validateAndSaveTransactionRequest));
          delete request["payrollDepositRequest"][field];

          try {
            await transactionService.validateAndSaveTransaction(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining("payrollDepositRequest"));
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        });
      });

      it("should throw ServiceException with DOES_NOT_EXIST error if the Disbursement is not found", async () => {
        const payrollDisbursementID = uuid();
        when(employerService.getDisbursement(payrollDisbursementID)).thenResolve(null);

        try {
          await transactionService.validateAndSaveTransaction({
            type: WorkflowName.PAYROLL_DEPOSIT,
            payrollDepositRequest: {
              disbursementID: payrollDisbursementID,
            },
          });
        } catch (ex) {
          expect(ex).toBeInstanceOf(ServiceException);
          expect(ex.errorCode).toBe(ServiceErrorCode.DOES_NOT_EXIST);
          expect(ex.message).toEqual(expect.stringContaining(payrollDisbursementID));
        }
      });

      it("should throw ServiceException with UNKNOWN error if the Payroll is not found", async () => {
        const employerID = uuid();
        const employee: Employee = getRandomEmployee(employerID);
        const payroll: Payroll = getRandomPayroll(employerID).payroll;
        const payrollDisbursement: PayrollDisbursement = getRandomPayrollDisbursement(
          payroll.id,
          employee.id,
        ).payrollDisbursement;

        when(employerService.getDisbursement(payrollDisbursement.id)).thenResolve(payrollDisbursement);
        when(employerService.getPayrollByID(payroll.id)).thenResolve(null);

        try {
          await transactionService.validateAndSaveTransaction({
            type: WorkflowName.PAYROLL_DEPOSIT,
            payrollDepositRequest: {
              disbursementID: payrollDisbursement.id,
            },
          });
        } catch (ex) {
          expect(ex).toBeInstanceOf(ServiceException);
          expect(ex.errorCode).toBe(ServiceErrorCode.UNKNOWN);
          expect(ex.message).toEqual(expect.stringContaining(payroll.id));
        }
      });

      it("should throw ServiceException with UNKNOWN error if the Employer is not found", async () => {
        const employer: Employer = getRandomEmployer("Test Employer");
        const employee: Employee = getRandomEmployee(employer.id);
        const payroll: Payroll = getRandomPayroll(employer.id).payroll;
        const payrollDisbursement: PayrollDisbursement = getRandomPayrollDisbursement(
          payroll.id,
          employee.id,
        ).payrollDisbursement;

        when(employerService.getDisbursement(payrollDisbursement.id)).thenResolve(payrollDisbursement);
        when(employerService.getPayrollByID(payroll.id)).thenResolve(payroll);
        when(employerService.getEmployerByID(employer.id)).thenResolve(null);

        try {
          await transactionService.validateAndSaveTransaction({
            type: WorkflowName.PAYROLL_DEPOSIT,
            payrollDepositRequest: {
              disbursementID: payrollDisbursement.id,
            },
          });
        } catch (ex) {
          expect(ex).toBeInstanceOf(ServiceException);
          expect(ex.errorCode).toBe(ServiceErrorCode.UNKNOWN);
          expect(ex.message).toEqual(expect.stringContaining(employer.id));
        }
      });

      it("should throw ServiceException with UNKNOWN error if the Employee is not found", async () => {
        const employer: Employer = getRandomEmployer("Test Employer");
        const employee: Employee = getRandomEmployee(employer.id);
        const payroll: Payroll = getRandomPayroll(employer.id).payroll;
        const payrollDisbursement: PayrollDisbursement = getRandomPayrollDisbursement(
          payroll.id,
          employee.id,
        ).payrollDisbursement;

        when(employerService.getDisbursement(payrollDisbursement.id)).thenResolve(payrollDisbursement);
        when(employerService.getPayrollByID(payroll.id)).thenResolve(payroll);
        when(employerService.getEmployerByID(employer.id)).thenResolve(employer);
        when(employeeService.getEmployeeByID(employee.id)).thenResolve(null);

        try {
          await transactionService.validateAndSaveTransaction({
            type: WorkflowName.PAYROLL_DEPOSIT,
            payrollDepositRequest: {
              disbursementID: payrollDisbursement.id,
            },
          });
        } catch (ex) {
          expect(ex).toBeInstanceOf(ServiceException);
          expect(ex.errorCode).toBe(ServiceErrorCode.UNKNOWN);
          expect(ex.message).toEqual(expect.stringContaining(employee.id));
        }
      });

      it("should returns the transaction with proper fields on success", async () => {
        const employer: Employer = getRandomEmployer("Test Employer");
        const employee: Employee = getRandomEmployee(employer.id);
        const payroll: Payroll = getRandomPayroll(employer.id).payroll;
        const payrollDisbursement: PayrollDisbursement = getRandomPayrollDisbursement(
          payroll.id,
          employee.id,
        ).payrollDisbursement;

        when(employerService.getPayrollByID(payroll.id)).thenResolve(payroll);
        when(employerService.getDisbursement(payrollDisbursement.id)).thenResolve(payrollDisbursement);
        when(employerService.getEmployerByID(employer.id)).thenResolve(employer);
        when(employeeService.getEmployeeByID(employee.id)).thenResolve(employee);
        when(transactionRepo.createTransaction(anything())).thenResolve(null);

        await transactionService.validateAndSaveTransaction({
          type: WorkflowName.PAYROLL_DEPOSIT,
          payrollDepositRequest: {
            disbursementID: payrollDisbursement.id,
          },
        });

        const [propagatedTransactionToSave] = capture(transactionRepo.createTransaction).last();
        expect(propagatedTransactionToSave.memo).toEqual(expect.stringContaining(payroll.payrollDate));
        expect(propagatedTransactionToSave.exchangeRate).toBe(payroll.exchangeRate);
        expect(propagatedTransactionToSave.workflowName).toBe(WorkflowName.PAYROLL_DEPOSIT);
        expect(propagatedTransactionToSave.transactionRef).toBeDefined();
        expect(propagatedTransactionToSave.debitAmount).toBe(payrollDisbursement.allocationAmount);
        expect(propagatedTransactionToSave.debitCurrency).toBe(Currency.COP);
        expect(propagatedTransactionToSave.creditAmount).toBe(
          payrollDisbursement.allocationAmount * payroll.exchangeRate,
        );
        expect(propagatedTransactionToSave.creditCurrency).toBe(Currency.USD);
        expect(propagatedTransactionToSave.creditConsumerID).toBe(employee.consumerID);
        expect(propagatedTransactionToSave.sessionKey).toBe("PAYROLL");
      });
    });

    describe("CARD_CREDIT_ADJUSTMENT", () => {
      describe("validation errors", () => {
        const validateAndSaveTransactionRequest: InitiateTransactionRequest = {
          type: WorkflowName.CARD_CREDIT_ADJUSTMENT,
          cardCreditAdjustmentRequest: {
            creditAmount: 100,
            creditCurrency: Currency.COP,
            debitAmount: 10,
            debitCurrency: Currency.USD,
            creditConsumerID: "CREDIT_CONSUMER_ID",
            exchangeRate: 0.1,
            memo: "MEMO",
          },
        };

        it.each([
          "debitAmount",
          "debitCurrency",
          "creditAmount",
          "creditCurrency",
          "exchangeRate",
          "memo",
          "creditConsumerID",
        ])("should throw error if '%s' is not specified", async field => {
          const request = JSON.parse(JSON.stringify(validateAndSaveTransactionRequest));
          delete request["cardCreditAdjustmentRequest"][field];

          try {
            await transactionService.validateAndSaveTransaction(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining("cardCreditAdjustmentRequest"));
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        });

        it.each(["creditCurrency", "debitCurrency"])("should throw error if '%s' has INVALID value", async field => {
          const request = JSON.parse(JSON.stringify(validateAndSaveTransactionRequest));
          request["cardCreditAdjustmentRequest"][field] = "INVALID";

          try {
            await transactionService.validateAndSaveTransaction(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining("cardCreditAdjustmentRequest"));
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        });
      });

      it("should correctly save the CARD_CREDIT_ADJUSTMENT transaction", async () => {
        const request: InitiateTransactionRequest = {
          type: WorkflowName.CARD_CREDIT_ADJUSTMENT,
          cardCreditAdjustmentRequest: {
            creditAmount: 100,
            creditCurrency: Currency.COP,
            debitAmount: 10,
            debitCurrency: Currency.USD,
            creditConsumerID: "CREDIT_CONSUMER_ID",
            exchangeRate: 0.1,
            memo: "MEMO",
          },
        };
        const transaction: Transaction = {
          id: "NOBA_TRANSACTION_ID",
          transactionRef: "DUMMY_REF",
          exchangeRate: 0.1,
          debitAmount: 10,
          debitCurrency: Currency.USD,
          creditConsumerID: "CREDIT_CONSUMER_ID",
          creditAmount: 100,
          creditCurrency: Currency.COP,
          transactionFees: [],
          sessionKey: "CARD_ADJUSTMENTS",
          status: TransactionStatus.INITIATED,
          workflowName: WorkflowName.CARD_CREDIT_ADJUSTMENT,
        };
        when(transactionRepo.createTransaction(anything())).thenResolve(transaction);

        const response = await transactionService.validateAndSaveTransaction(request);

        expect(response).toStrictEqual(transaction);
        const [propagatedInputTransactionArg] = capture(transactionRepo.createTransaction).last();
        expect(propagatedInputTransactionArg).toStrictEqual({
          transactionRef: expect.any(String),
          workflowName: WorkflowName.CARD_CREDIT_ADJUSTMENT,
          debitAmount: 10,
          debitCurrency: Currency.USD,
          creditConsumerID: "CREDIT_CONSUMER_ID",
          creditAmount: 100,
          creditCurrency: Currency.COP,
          memo: "MEMO",
          exchangeRate: 0.1,
          sessionKey: "CARD_ADJUSTMENTS",
          transactionFees: [],
        });
      });
    });

    describe("CARD_DEBIT_ADJUSTMENT", () => {
      describe("validation errors", () => {
        const validateAndSaveTransactionRequest: InitiateTransactionRequest = {
          type: WorkflowName.CARD_DEBIT_ADJUSTMENT,
          cardDebitAdjustmentRequest: {
            creditAmount: 100,
            creditCurrency: Currency.COP,
            debitAmount: 10,
            debitCurrency: Currency.USD,
            debitConsumerID: "DEBIT_CONSUMER_ID",
            exchangeRate: 0.1,
            memo: "MEMO",
          },
        };

        it.each([
          "debitAmount",
          "debitCurrency",
          "creditAmount",
          "creditCurrency",
          "exchangeRate",
          "memo",
          "debitConsumerID",
        ])("should throw error if '%s' is not specified", async field => {
          const request = JSON.parse(JSON.stringify(validateAndSaveTransactionRequest));
          delete request["cardDebitAdjustmentRequest"][field];

          try {
            await transactionService.validateAndSaveTransaction(request);
            expect(true).toBe(false);
          } catch (err) {
            expect(err.message).toEqual(expect.stringContaining("cardDebitAdjustmentRequest"));
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        });

        it.each(["creditCurrency", "debitCurrency"])("should throw error if '%s' has INVALID value", async field => {
          const request = JSON.parse(JSON.stringify(validateAndSaveTransactionRequest));
          request["cardDebitAdjustmentRequest"][field] = "INVALID";

          try {
            await transactionService.validateAndSaveTransaction(request);
            expect(true).toBe(false);
          } catch (err) {
            console.log(err);
            expect(err.message).toEqual(expect.stringContaining("cardDebitAdjustmentRequest"));
            expect(err.message).toEqual(expect.stringContaining(`${field}`));
          }
        });
      });

      it("should correctly save the CARD_DEBIT_ADJUSTMENT transaction", async () => {
        const request: InitiateTransactionRequest = {
          type: WorkflowName.CARD_DEBIT_ADJUSTMENT,
          cardDebitAdjustmentRequest: {
            creditAmount: 100,
            creditCurrency: Currency.COP,
            debitAmount: 10,
            debitCurrency: Currency.USD,
            debitConsumerID: "DEBIT_CONSUMER_ID",
            exchangeRate: 0.1,
            memo: "MEMO",
          },
        };
        const transaction: Transaction = {
          id: "NOBA_TRANSACTION_ID",
          transactionRef: "DUMMY_REF",
          exchangeRate: 0.1,
          debitAmount: 10,
          debitCurrency: Currency.USD,
          creditConsumerID: "DEBIT_CONSUMER_ID",
          creditAmount: 100,
          creditCurrency: Currency.COP,
          transactionFees: [],
          sessionKey: "CARD_ADJUSTMENTS",
          status: TransactionStatus.INITIATED,
          workflowName: WorkflowName.CARD_DEBIT_ADJUSTMENT,
        };
        when(transactionRepo.createTransaction(anything())).thenResolve(transaction);

        const response = await transactionService.validateAndSaveTransaction(request);

        expect(response).toStrictEqual(transaction);
        const [propagatedInputTransactionArg] = capture(transactionRepo.createTransaction).last();
        expect(propagatedInputTransactionArg).toStrictEqual({
          transactionRef: expect.any(String),
          workflowName: WorkflowName.CARD_DEBIT_ADJUSTMENT,
          debitAmount: 10,
          debitCurrency: Currency.USD,
          debitConsumerID: "DEBIT_CONSUMER_ID",
          creditAmount: 100,
          creditCurrency: Currency.COP,
          memo: "MEMO",
          exchangeRate: 0.1,
          sessionKey: "CARD_ADJUSTMENTS",
          transactionFees: [],
        });
      });
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

      const transactionEventToAdd = {
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

    it("should update the status 'AND' raise the alert if transaction is transition to 'FAILED' status", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      when(transactionRepo.getTransactionByID(transaction.id)).thenResolve(transaction);
      when(alertService.raiseAlert(anything())).thenResolve();

      const updateTransactionDTO: UpdateTransactionDTO = {
        status: TransactionStatus.FAILED,
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

      const [alertCall] = capture(alertService.raiseAlert).last();
      expect(alertCall).toEqual(expect.objectContaining({ key: "TRANSACTION_FAILED" }));
      expect(alertCall).toEqual(expect.objectContaining({ message: expect.stringContaining(transaction.id) }));
    });

    it("should throw a ServiceException if the transaction doesn't exist", async () => {
      const transactionID = "non-existient-transaction-id";
      when(transactionRepo.getTransactionByID(transactionID)).thenResolve(null);

      expect(async () => await transactionService.updateTransaction(transactionID, {})).rejects.toThrowError(
        ServiceException,
      );
    });
  });

  describe("debitFromBank", () => {
    it("should debit from a bank account", async () => {
      const { transaction } = getRandomTransaction("consumerID", "consumerID2");
      transaction.creditAmount = 111;
      transaction.creditCurrency = "USD";
      transaction.debitAmount = 222;
      transaction.debitCurrency = "COP";

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

      const returnedBankService = instance(monoService);
      when(bankFactory.getBankImplementationByCurrency(transaction.creditCurrency)).thenReturn(returnedBankService);

      const factoryResponse = {
        state: "SUCCESS",
        withdrawalID: "fake-withdrawal-id",
      };
      when(monoService.debit(anything())).thenResolve(factoryResponse);

      const response = await transactionService.debitFromBank(transaction.id);

      expect(response).toStrictEqual(factoryResponse);
      const [debitRequest] = capture(monoService.debit).last();
      expect(debitRequest).toEqual({
        amount: 111,
        currency: "USD",
        bankCode: withdrawalDetails.bankCode,
        accountNumber: withdrawalDetails.accountNumber,
        accountType: withdrawalDetails.accountType,
        documentNumber: withdrawalDetails.documentNumber,
        documentType: withdrawalDetails.documentType,
        transactionID: transaction.id,
        consumerID: transaction.debitConsumerID,
        transactionRef: transaction.transactionRef,
      });
    });

    it("should throw a ServiceException if the transaction doesn't exist", async () => {
      const transactionID = "non-existient-transaction-id";
      when(transactionRepo.getTransactionByID(transactionID)).thenResolve(null);
      when(withdrawalDetailsRepo.getWithdrawalDetailsByTransactionID(transactionID)).thenResolve(
        {} as WithdrawalDetails,
      );

      expect(transactionService.debitFromBank(transactionID)).rejects.toThrowError(ServiceException);
    });

    it("should throw a ServiceException if the withdrawal details don't exist", async () => {
      const transactionID = "non-existient-transaction-id";
      when(transactionRepo.getTransactionByID(transactionID)).thenResolve({} as Transaction);
      when(withdrawalDetailsRepo.getWithdrawalDetailsByTransactionID(transactionID)).thenResolve(null);

      expect(transactionService.debitFromBank(transactionID)).rejects.toThrowError(ServiceException);
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
  workflowName: ConsumerWorkflowName = WorkflowName.WALLET_TRANSFER,
): { transaction: Transaction; transactionDTO: InitiateTransactionDTO; inputTransaction: InputTransaction } => {
  let exchangeRate;
  let debitCurrency;
  let creditCurrency;
  let debitAmount;
  let creditAmount;
  let withdrawalData;
  switch (workflowName) {
    case WorkflowName.WALLET_TRANSFER:
      exchangeRate = 1;
      debitCurrency = Currency.USD;
      creditCurrency = Currency.USD;
      debitAmount = 100;
      creditAmount = 100;
      break;
    case WorkflowName.WALLET_DEPOSIT:
      exchangeRate = getCOPUSDExchangeRate().nobaRate;
      debitCurrency = Currency.COP;
      creditCurrency = Currency.USD;
      debitAmount = 100;
      creditAmount = 100;
      break;
    case WorkflowName.WALLET_WITHDRAWAL:
      exchangeRate = getUSDCOPExchangeRate().nobaRate;
      debitCurrency = Currency.USD;
      creditCurrency = Currency.COP;
      debitAmount = 100;
      creditAmount = 100;
      withdrawalData = {
        accountNumber: "12345",
        accountType: AccountType.SAVINGS,
        bankCode: "BOFA",
        documentNumber: "123456789",
        documentType: DocumentType.CC,
      };
      break;
    default:
      throw new Error("Invalid workflow name");
  }

  const transaction: Transaction = {
    transactionRef: Utils.generateLowercaseUUID(true),
    exchangeRate: exchangeRate,
    status: TransactionStatus.INITIATED,
    workflowName: workflowName,
    id: v4(),
    sessionKey: v4(),
    memo: "New transaction",
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
    ...(withdrawalData && { withdrawalData }),
    transactionFees: [
      {
        id: v4(),
        amount: 1,
        currency: Currency.USD,
        type: FeeType.PROCESSING,
        timestamp: new Date(),
      },
    ],
  };

  const transactionDTO: InitiateTransactionDTO = {
    workflowName: workflowName,
    memo: transaction.memo,
    ...(withdrawalData && { withdrawalData }),
  };

  const inputTransaction: InputTransaction = {
    transactionRef: transaction.transactionRef,
    workflowName: transaction.workflowName,
    exchangeRate: transaction.exchangeRate,
    memo: transaction.memo,
    sessionKey: transaction.sessionKey,
    transactionFees: [
      {
        amount: 1,
        currency: Currency.USD,
        type: FeeType.PROCESSING,
      },
    ],
  };

  transaction.debitAmount = debitAmount;
  transaction.debitCurrency = debitCurrency;
  transaction.creditAmount = creditAmount;
  transaction.creditCurrency = creditCurrency;
  if (debitConsumerID) transaction.debitConsumerID = debitConsumerID;
  if (creditConsumerID) transaction.creditConsumerID = creditConsumerID;

  transactionDTO.debitAmount = transaction.debitAmount;
  transactionDTO.debitCurrency = transaction.debitCurrency as any;
  transactionDTO.debitConsumerIDOrTag = transaction.debitConsumerID;
  transactionDTO.creditConsumerIDOrTag = transaction.creditConsumerID;

  inputTransaction.debitAmount = transaction.debitAmount;
  inputTransaction.debitCurrency = transaction.debitCurrency;
  inputTransaction.debitConsumerID = transaction.debitConsumerID;
  inputTransaction.creditConsumerID = transaction.creditConsumerID;
  inputTransaction.creditAmount = transaction.creditAmount;
  inputTransaction.creditCurrency = transaction.creditCurrency;

  return { transaction, transactionDTO, inputTransaction };
};
