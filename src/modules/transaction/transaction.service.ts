import { Inject, Injectable } from "@nestjs/common";
import {
  InputTransaction,
  Transaction,
  TransactionStatus,
  UpdateTransaction,
  WorkflowName,
} from "./domain/Transaction";
import { TransactionFilterOptionsDTO } from "./dto/TransactionFilterOptionsDTO";
import { InitiateTransactionDTO } from "./dto/CreateTransactionDTO";
import { ITransactionRepo } from "./repo/transaction.repo";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { TRANSACTION_REPO_PROVIDER, WITHDRAWAL_DETAILS_REPO_PROVIDER } from "./repo/transaction.repo.module";
import { ConsumerService } from "../consumer/consumer.service";
import { ServiceErrorCode, ServiceException } from "../../core/exception/service.exception";
import { PaginatedResult } from "../../core/infra/PaginationTypes";
import { Currency } from "./domain/TransactionTypes";
import { QuoteResponseDTO } from "./dto/QuoteResponseDTO";
import { AddTransactionEventDTO, TransactionEventDTO } from "./dto/TransactionEventDTO";
import { InputTransactionEvent, TransactionEvent } from "./domain/TransactionEvent";
import { UpdateTransactionDTO } from "./dto/TransactionDTO";
import { TransactionVerification } from "../verification/domain/TransactionVerification";
import { VerificationService } from "../verification/verification.service";
import { KYCStatus } from "@prisma/client";
import { WorkflowFactory } from "./factory/workflow.factory";
import { IWithdrawalDetailsRepo } from "./repo/withdrawal.details.repo";
import { InputWithdrawalDetails, WithdrawalDetails } from "./domain/WithdrawalDetails";
import { TransactionFlags } from "./domain/TransactionFlags";
import { DebitBankResponse } from "./domain/Transaction";
import { BankFactory } from "../psp/factory/bank.factory";
import { Utils } from "../../core/utils/Utils";
import { ProcessedTransactionDTO } from "./dto/ProcessedTransactionDTO";
import { EmployerService } from "../employer/employer.service";
import { PayrollDisbursement } from "../employer/domain/PayrollDisbursement";
import { Payroll } from "../employer/domain/Payroll";
import { EmployeeService } from "../employee/employee.service";
import { Employee } from "../employee/domain/Employee";
import { AlertService } from "../common/alerts/alert.service";
import { AlertKey } from "../common/alerts/alert.dto";
import { Employer } from "../employer/domain/Employer";
import {
  CardCreditAdjustmentTransactionRequest,
  CardDebitAdjustmentTransactionRequest,
  CardReversalTransactionRequest,
  CardReversalTransactionType,
  CardWithdrawalTransactionRequest,
  CreditAdjustmentTransactionRequest,
  DebitAdjustmentTransactionRequest,
  InitiateTransactionRequest,
  PayrollDepositTransactionRequest,
  validateInitiateTransactionRequest,
} from "./dto/transaction.service.dto";
import { KmsKeyType } from "../../config/configtypes/KmsConfigs";
import { KmsService } from "../common/kms.service";

@Injectable()
export class TransactionService {
  constructor(
    @Inject(TRANSACTION_REPO_PROVIDER) private readonly transactionRepo: ITransactionRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(WITHDRAWAL_DETAILS_REPO_PROVIDER) private readonly withdrawalDetailsRepo: IWithdrawalDetailsRepo,
    private readonly consumerService: ConsumerService,
    private readonly verificationService: VerificationService,
    private readonly transactionFactory: WorkflowFactory,
    private readonly bankFactory: BankFactory,
    private readonly employerService: EmployerService,
    private readonly employeeService: EmployeeService,
    private readonly alertService: AlertService,
    private readonly kmsService: KmsService,
  ) {}

  async getTransactionByTransactionRef(transactionRef: string, consumerID?: string): Promise<Transaction> {
    const transaction: Transaction = await this.transactionRepo.getTransactionByTransactionRef(transactionRef);
    if (!transaction) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: `Could not find transaction with transactionRef: ${transactionRef}`,
      });
    }
    if (consumerID && transaction.debitConsumerID !== consumerID && transaction.creditConsumerID !== consumerID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: `Could not find transaction with transactionRef: ${transactionRef} for consumerID: ${consumerID}`,
      });
    }
    return transaction;
  }

  async getTransactionByTransactionID(transactionID: string): Promise<Transaction> {
    return await this.transactionRepo.getTransactionByID(transactionID);
  }

  async getFilteredTransactions(filter: TransactionFilterOptionsDTO): Promise<PaginatedResult<Transaction>> {
    return this.transactionRepo.getFilteredTransactions(filter);
  }

  async initiateTransaction(request: InitiateTransactionRequest): Promise<Transaction> {
    const transaction = await this.validateAndSaveTransaction(request);
    const workflowImpl = this.transactionFactory.getWorkflowImplementation(request.type);
    await workflowImpl.initiateWorkflow(transaction);

    return transaction;
  }

  async validateAndSaveTransaction(request: InitiateTransactionRequest): Promise<Transaction> {
    if (
      request.type !== WorkflowName.CARD_WITHDRAWAL &&
      request.type !== WorkflowName.CARD_REVERSAL &&
      request.type !== WorkflowName.PAYROLL_DEPOSIT &&
      request.type !== WorkflowName.CARD_CREDIT_ADJUSTMENT &&
      request.type !== WorkflowName.CARD_DEBIT_ADJUSTMENT &&
      request.type !== WorkflowName.CREDIT_ADJUSTMENT &&
      request.type !== WorkflowName.DEBIT_ADJUSTMENT
    ) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.NOT_IMPLEMENTED,
        message: `'validateAndSaveTransaction' not implemented for workflow: ${request.type}}`,
      });
    }

    // TODO: Refactor to a 'TransactionExecutor' class after cleaning up iWorkflowImpl
    validateInitiateTransactionRequest(request);

    let inputTransaction: InputTransaction;
    switch (request.type) {
      case WorkflowName.CARD_WITHDRAWAL:
        inputTransaction = this.createInputTransactionForCardWithdrawalRequest(request.cardWithdrawalRequest);
        break;

      case WorkflowName.CARD_REVERSAL:
        inputTransaction = this.createInputTransactionForCardReversalRequest(request.cardReversalRequest);
        break;

      case WorkflowName.PAYROLL_DEPOSIT:
        inputTransaction = await this.createInputTransactionForPayrollDepositRequest(request.payrollDepositRequest);
        break;

      case WorkflowName.CARD_CREDIT_ADJUSTMENT:
        inputTransaction = this.createInputTransactionForCardCreditAdjustmentRequest(
          request.cardCreditAdjustmentRequest,
        );
        break;

      case WorkflowName.CARD_DEBIT_ADJUSTMENT:
        inputTransaction = this.createInputTransactionForCardDebitAdjustmentRequest(request.cardDebitAdjustmentRequest);
        break;

      case WorkflowName.CREDIT_ADJUSTMENT:
        inputTransaction = await this.createInputTransactionForCreditAdjustmentRequest(request.creditAdjustmentRequest);
        break;

      case WorkflowName.DEBIT_ADJUSTMENT:
        inputTransaction = await this.createInputTransactionForDebitAdjustmentRequest(request.debitAdjustmentRequest);
        break;
    }

    const transaction: Transaction = await this.transactionRepo.createTransaction(inputTransaction);
    return transaction;
  }

  // [DEPRECATED]: use `initiateTransaction` method instead.
  async deprecatedInitiateTransaction(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
    sessionKey: string,
  ): Promise<Transaction> {
    if (!initiatingConsumer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Must have consumer to initiate transaction",
      });
    }
    const workflowImpl = this.transactionFactory.getWorkflowImplementation(transactionDetails.workflowName);

    const partialTransaction: ProcessedTransactionDTO = await workflowImpl.preprocessTransactionParams(
      transactionDetails,
      initiatingConsumer,
    );

    const transaction: InputTransaction = {
      ...partialTransaction,
      transactionRef: Utils.generateLowercaseUUID(true),
      sessionKey: sessionKey,
    };

    transaction.sessionKey = sessionKey;

    // Ensure that consumers on both side of the transaction are in good standing
    if (transactionDetails.creditConsumerIDOrTag) {
      const consumer = await this.consumerService.getActiveConsumer(transactionDetails.creditConsumerIDOrTag);
      transaction.creditConsumerID = consumer.props.id;
    }

    if (transactionDetails.debitConsumerIDOrTag) {
      const consumer = await this.consumerService.getActiveConsumer(transactionDetails.debitConsumerIDOrTag);
      transaction.debitConsumerID = consumer.props.id;
    }

    if (transaction.creditConsumerID === transaction.debitConsumerID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "debit & credit cannot be same entity",
      });
    }

    const savedTransaction: Transaction = await this.transactionRepo.createTransaction(transaction);

    let withdrawalDetails: WithdrawalDetails;
    if (transactionDetails.withdrawalData) {
      withdrawalDetails = await this.addWithdrawalDetails({
        transactionID: savedTransaction.id,
        ...transactionDetails.withdrawalData,
      });
    }

    // Perform sanctions check
    try {
      // If it passes, simple return. If it fails, an exception will be thrown
      if (!(await this.validateForSanctions(initiatingConsumer, savedTransaction, withdrawalDetails))) {
        await this.transactionRepo.updateTransactionByTransactionID(savedTransaction.id, {
          status: TransactionStatus.FAILED,
        });
        throw new ServiceException({
          errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
          message: "Transaction failed due to sanctions check",
        });
      }
    } catch (e) {
      if (e instanceof ServiceException) {
        await this.transactionRepo.updateTransactionByTransactionID(savedTransaction.id, {
          status: TransactionStatus.FAILED,
        });
        throw e;
      }
    }

    await workflowImpl.initiateWorkflow(savedTransaction, transactionDetails.options);

    return savedTransaction;
  }

  async getTransactionQuote(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    workflowName: WorkflowName,
    options?: TransactionFlags[],
  ): Promise<QuoteResponseDTO> {
    if (Object.values(Currency).indexOf(amountCurrency) === -1) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Invalid base currency",
      });
    }

    if (Object.values(Currency).indexOf(desiredCurrency) === -1) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Invalid desired currency",
      });
    }

    /* Investigate: 
    - Add global parameters to control processing fees
    - Add global parameters to control noba fees
    - Add consumer check for user promos
    - Add tier based fees
    */
    const workflowImpl = this.transactionFactory.getWorkflowImplementation(workflowName);
    return workflowImpl.getTransactionQuote(amount, amountCurrency, desiredCurrency, options);
  }

  async updateTransaction(transactionID: string, transactionDetails: UpdateTransactionDTO): Promise<Transaction> {
    const transaction = await this.transactionRepo.getTransactionByID(transactionID);
    if (!transaction) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: "Transaction does not exist",
      });
    }

    if (transactionDetails.status !== undefined && transactionDetails.status === TransactionStatus.FAILED) {
      this.alertService.raiseAlert({
        key: AlertKey.TRANSACTION_FAILED,
        message: `Transaction with ID '${transactionID}' is transitioned to 'FAILED' state.`,
      });
    }

    // Only allow these two fields to be updated. Others are more sensitive and get updated by other methods.
    const transactionUpdate: UpdateTransaction = {
      ...(transactionDetails.status !== undefined && { status: transactionDetails.status }),
    };

    return await this.transactionRepo.updateTransactionByTransactionID(transactionID, transactionUpdate);
  }

  private createInputTransactionForCardWithdrawalRequest(
    cardWithdrawalRequest: CardWithdrawalTransactionRequest,
  ): InputTransaction {
    return {
      id: cardWithdrawalRequest.nobaTransactionID,
      transactionRef: Utils.generateLowercaseUUID(true),
      workflowName: WorkflowName.CARD_WITHDRAWAL,
      debitAmount: cardWithdrawalRequest.debitAmountInUSD,
      debitCurrency: Currency.USD,
      debitConsumerID: cardWithdrawalRequest.debitConsumerID,
      creditAmount: cardWithdrawalRequest.creditAmount,
      creditCurrency: cardWithdrawalRequest.creditCurrency,
      memo: cardWithdrawalRequest.memo,
      exchangeRate: cardWithdrawalRequest.exchangeRate,
      sessionKey: "CARD_WITHDRAWAL",
      transactionFees: [],
    };
  }

  private createInputTransactionForCardReversalRequest(
    cardReversalRequest: CardReversalTransactionRequest,
  ): InputTransaction {
    if (cardReversalRequest.type === CardReversalTransactionType.CREDIT) {
      return {
        id: cardReversalRequest.nobaTransactionID,
        transactionRef: Utils.generateLowercaseUUID(true),
        workflowName: WorkflowName.CARD_REVERSAL,
        creditAmount: cardReversalRequest.amountInUSD,
        creditCurrency: Currency.USD,
        creditConsumerID: cardReversalRequest.consumerID,
        memo: cardReversalRequest.memo,
        exchangeRate: cardReversalRequest.exchangeRate,
        sessionKey: "CARD_REVERSAL",
        transactionFees: [],
      };
    } else {
      return {
        id: cardReversalRequest.nobaTransactionID,
        transactionRef: Utils.generateLowercaseUUID(true),
        workflowName: WorkflowName.CARD_REVERSAL,
        debitAmount: cardReversalRequest.amountInUSD,
        debitCurrency: Currency.USD,
        debitConsumerID: cardReversalRequest.consumerID,
        memo: cardReversalRequest.memo,
        exchangeRate: cardReversalRequest.exchangeRate,
        sessionKey: "CARD_REVERSAL",
        transactionFees: [],
      };
    }
  }

  private async createInputTransactionForPayrollDepositRequest(
    request: PayrollDepositTransactionRequest,
  ): Promise<InputTransaction> {
    const payrollDisbursement: PayrollDisbursement = await this.employerService.getDisbursement(request.disbursementID);
    if (!payrollDisbursement) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: `Payroll disbursement with ID '${request.disbursementID}' not found.`,
      });
    }

    const payroll: Payroll = await this.employerService.getPayrollByID(payrollDisbursement.payrollID);
    if (!payroll) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: `Payroll disbursement with ID '${payrollDisbursement.id}' exist but corresponding Payroll with ID '${payrollDisbursement.payrollID} not found.`,
      });
    }

    const employer: Employer = await this.employerService.getEmployerByID(payroll.employerID);
    if (!employer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: `Employer '${payroll.employerID}' for payroll ID '${payroll.id}' does not exist.`,
      });
    }

    const employerName = employer.name;

    const employee: Employee = await this.employeeService.getEmployeeByID(payrollDisbursement.employeeID);
    if (!employee) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: `Employee with ID '${payrollDisbursement.employeeID}' not found.`,
      });
    }

    return {
      workflowName: WorkflowName.PAYROLL_DEPOSIT,
      exchangeRate: payroll.exchangeRate,
      memo: `${employerName} Payroll for ${payroll.payrollDate}`,
      transactionRef: Utils.generateLowercaseUUID(true),
      transactionFees: [],
      sessionKey: "PAYROLL",
      debitAmount: payrollDisbursement.allocationAmount,
      debitCurrency: Currency.COP,
      creditAmount: Utils.roundTo2DecimalNumber(payrollDisbursement.allocationAmount * payroll.exchangeRate),
      creditCurrency: Currency.USD,
      creditConsumerID: employee.consumerID,
    };
  }

  private createInputTransactionForCardCreditAdjustmentRequest(
    request: CardCreditAdjustmentTransactionRequest,
  ): InputTransaction {
    return {
      transactionRef: Utils.generateLowercaseUUID(true),
      workflowName: WorkflowName.CARD_CREDIT_ADJUSTMENT,
      debitAmount: request.debitAmount,
      debitCurrency: request.debitCurrency,
      creditAmount: request.creditAmount,
      creditCurrency: request.creditCurrency,
      creditConsumerID: request.creditConsumerID,
      memo: request.memo,
      exchangeRate: request.exchangeRate,
      sessionKey: "CARD_ADJUSTMENTS",
      transactionFees: [],
    };
  }

  private createInputTransactionForCardDebitAdjustmentRequest(
    request: CardDebitAdjustmentTransactionRequest,
  ): InputTransaction {
    return {
      transactionRef: Utils.generateLowercaseUUID(true),
      workflowName: WorkflowName.CARD_DEBIT_ADJUSTMENT,
      debitAmount: request.debitAmount,
      debitCurrency: request.debitCurrency,
      creditAmount: request.creditAmount,
      creditCurrency: request.creditCurrency,
      debitConsumerID: request.debitConsumerID,
      memo: request.memo,
      exchangeRate: request.exchangeRate,
      sessionKey: "CARD_ADJUSTMENTS",
      transactionFees: [],
    };
  }

  private async createInputTransactionForCreditAdjustmentRequest(
    request: CreditAdjustmentTransactionRequest,
  ): Promise<InputTransaction> {
    return {
      workflowName: WorkflowName.CREDIT_ADJUSTMENT,
      exchangeRate: 1,
      memo: request.memo,
      transactionRef: Utils.generateLowercaseUUID(true),
      transactionFees: [],
      sessionKey: WorkflowName.CREDIT_ADJUSTMENT,
      creditAmount: request.creditAmount,
      creditCurrency: request.creditCurrency,
      creditConsumerID: request.creditConsumerID,
      debitAmount: request.creditAmount,
      debitCurrency: request.creditCurrency,
    };
  }

  private async createInputTransactionForDebitAdjustmentRequest(
    request: DebitAdjustmentTransactionRequest,
  ): Promise<InputTransaction> {
    return {
      workflowName: WorkflowName.DEBIT_ADJUSTMENT,
      exchangeRate: 1,
      memo: request.memo,
      transactionRef: Utils.generateLowercaseUUID(true),
      transactionFees: [],
      sessionKey: WorkflowName.DEBIT_ADJUSTMENT,
      debitAmount: request.debitAmount,
      debitCurrency: request.debitCurrency,
      debitConsumerID: request.debitConsumerID,
      creditAmount: request.debitAmount,
      creditCurrency: request.debitCurrency,
    };
  }

  private async validateForSanctions(
    consumerID: string,
    transaction: Transaction,
    withdrawalDetails: WithdrawalDetails,
  ): Promise<boolean> {
    try {
      const consumer = await this.consumerService.getConsumer(consumerID);

      // Check Sardine for sanctions
      const sardineTransactionInformation: TransactionVerification = {
        transactionRef: transaction.transactionRef,
        debitConsumerID: transaction.debitConsumerID,
        creditConsumerID: transaction.creditConsumerID,
        workflowName: transaction.workflowName,
        debitAmount: transaction.debitAmount,
        debitCurrency: transaction.debitCurrency,
        creditAmount: transaction.creditAmount,
        creditCurrency: transaction.creditCurrency,
        ...(withdrawalDetails && {
          withdrawalDetails: {
            ...(withdrawalDetails.accountNumber && {
              accountNumber: await this.kmsService.decryptString(withdrawalDetails.accountNumber, KmsKeyType.SSN),
            }),
            ...(withdrawalDetails.accountType && { accountType: withdrawalDetails.accountType }),
            ...(withdrawalDetails.bankCode && { bankCode: withdrawalDetails.bankCode }),
            ...(withdrawalDetails.documentNumber && { documentNumber: withdrawalDetails.documentNumber }),
            ...(withdrawalDetails.documentType && { documentType: withdrawalDetails.documentType }),
            ...(consumer.props.address?.countryCode && { country: consumer.props.address.countryCode }),
          },
        }),
      };

      const result = await this.verificationService.transactionVerification(
        transaction.sessionKey,
        consumer,
        sardineTransactionInformation,
      );

      if (result.status !== KYCStatus.APPROVED) {
        this.logger.debug(
          `Failed to make transaction. Reason: KYC Provider has tagged the transaction as high risk. ${JSON.stringify(
            result,
          )}`,
        );

        await this.addTransactionEvent(transaction.id, {
          message: "Transaction has been determined to be high risk",
          details: `Result: ${JSON.stringify(result.status)}`,
          internal: true,
        });

        return false;
      }
    } catch (e) {
      if (e instanceof ServiceException) {
        await this.addTransactionEvent(transaction.id, {
          message: "Error performing transaction verification",
          details: e.message,
          internal: true,
        });
      }
      throw e;
    }
    return true;
  }

  async addTransactionEvent(
    transactionID: string,
    transactionEvent: AddTransactionEventDTO,
  ): Promise<TransactionEventDTO> {
    const transaction = await this.transactionRepo.getTransactionByID(transactionID);
    if (!transaction) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: "Transaction does not exist",
      });
    }

    const inputTransactionEvent: InputTransactionEvent = {
      transactionID: transaction.id,
      internal: transactionEvent.internal ?? true,
      message: transactionEvent.message,
      ...(transactionEvent.details !== undefined && { details: transactionEvent.details }),
      ...(transactionEvent.key !== undefined && { key: transactionEvent.key }),
      ...(transactionEvent.parameters !== undefined &&
        transactionEvent.parameters.length > 0 && {
          param1: transactionEvent.parameters[0],
        }),
      ...(transactionEvent.parameters !== undefined &&
        transactionEvent.parameters.length > 1 && {
          param2: transactionEvent.parameters[1],
        }),
      ...(transactionEvent.parameters !== undefined &&
        transactionEvent.parameters.length > 2 && {
          param3: transactionEvent.parameters[2],
        }),
      ...(transactionEvent.parameters !== undefined &&
        transactionEvent.parameters.length > 3 && {
          param4: transactionEvent.parameters[3],
        }),
      ...(transactionEvent.parameters !== undefined &&
        transactionEvent.parameters.length > 4 && {
          param5: transactionEvent.parameters[4],
        }),
    };

    const savedTransactionEvent: TransactionEvent = await this.transactionRepo.addTransactionEvent(
      inputTransactionEvent,
    );

    return {
      timestamp: savedTransactionEvent.timestamp,
      internal: savedTransactionEvent.internal,
      message: savedTransactionEvent.message,
      ...(savedTransactionEvent.details !== undefined && { details: savedTransactionEvent.details }),
      ...(savedTransactionEvent.key !== undefined && { key: savedTransactionEvent.key }),
      ...(savedTransactionEvent.param1 !== undefined && {
        parameters: Array.of(
          savedTransactionEvent.param1,
          savedTransactionEvent.param2,
          savedTransactionEvent.param3,
          savedTransactionEvent.param4,
          savedTransactionEvent.param5,
        ),
      }),
    };
  }

  async debitFromBank(transactionID: string): Promise<DebitBankResponse> {
    const [transaction, withdrawal] = await Promise.all([
      this.getTransactionByTransactionID(transactionID),
      this.getWithdrawalDetails(transactionID),
    ]);
    if (!transaction) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: `Transaction not found: ${transactionID}`,
      });
    }
    if (!withdrawal) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.UNKNOWN,
        message: `Withdrawal details not found for transactionID: ${transactionID}`,
      });
    }

    const bank = this.bankFactory.getBankImplementationByCurrency(transaction.creditCurrency);
    const debitBankResponse = await bank.debit({
      amount: transaction.creditAmount,
      currency: transaction.creditCurrency,
      consumerID: transaction.debitConsumerID,
      transactionID: transactionID,
      transactionRef: transaction.transactionRef,
      accountNumber: withdrawal.accountNumber,
      accountType: withdrawal.accountType,
      bankCode: withdrawal.bankCode,
      documentNumber: withdrawal.documentNumber,
      documentType: withdrawal.documentType,
    });

    return debitBankResponse;
  }

  async getTransactionEvents(transactionID: string, includeInternalEvents: boolean): Promise<TransactionEvent[]> {
    const transactionEvents: TransactionEvent[] = await this.transactionRepo.getTransactionEvents(
      transactionID,
      includeInternalEvents,
    );
    return transactionEvents;
  }

  async getWithdrawalDetails(transactionID: string): Promise<WithdrawalDetails> {
    return this.withdrawalDetailsRepo.getWithdrawalDetailsByTransactionID(transactionID);
  }

  async addWithdrawalDetails(withdrawalDetails: InputWithdrawalDetails): Promise<WithdrawalDetails> {
    return this.withdrawalDetailsRepo.addWithdrawalDetails(withdrawalDetails);
  }
}
