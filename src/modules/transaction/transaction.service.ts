import { Inject, Injectable } from "@nestjs/common";
import { InputTransaction, Transaction, TransactionStatus, UpdateTransaction } from "./domain/Transaction";
import { TransactionFilterOptionsDTO } from "./dto/TransactionFilterOptionsDTO";
import { InitiateTransactionDTO } from "./dto/CreateTransactionDTO";
import { ITransactionRepo } from "./repo/transaction.repo";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { TRANSACTION_REPO_PROVIDER, WITHDRAWAL_DETAILS_REPO_PROVIDER } from "./repo/transaction.repo.module";
import { Utils } from "../../core/utils/Utils";
import { ConsumerService } from "../consumer/consumer.service";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";
import { PaginatedResult } from "../../core/infra/PaginationTypes";
import { Currency } from "./domain/TransactionTypes";
import { QuoteResponseDTO } from "./dto/QuoteResponseDTO";
import { ExchangeRateService } from "../common/exchangerate.service";
import { AddTransactionEventDTO, TransactionEventDTO } from "./dto/TransactionEventDTO";
import { InputTransactionEvent, TransactionEvent } from "./domain/TransactionEvent";
import { UpdateTransactionDTO } from "./dto/TransactionDTO";
import { TransactionVerification } from "../verification/domain/TransactionVerification";
import { VerificationService } from "../verification/verification.service";
import { KYCStatus } from "@prisma/client";
import { WorkflowFactory } from "./factory/workflow.factory";
import { IWithdrawalDetailsRepo } from "./repo/withdrawal.details.repo";
import { InputWithdrawalDetails, WithdrawalDetails } from "./domain/WithdrawalDetails";
import { DebitBankRequestDTO, DebitBankResponseDTO } from "./dto/transaction.workflow.controller.dto";
import { BankFactory } from "../psp/factory/bank.factory";

@Injectable()
export class TransactionService {
  constructor(
    @Inject(TRANSACTION_REPO_PROVIDER) private readonly transactionRepo: ITransactionRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(WITHDRAWAL_DETAILS_REPO_PROVIDER) private readonly withdrawalDetailsRepo: IWithdrawalDetailsRepo,
    private readonly consumerService: ConsumerService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly verificationService: VerificationService,
    private readonly transactionFactory: WorkflowFactory,
    private readonly bankFactory: BankFactory,
  ) {}

  async getTransactionByTransactionRef(transactionRef: string, consumerID: string): Promise<Transaction> {
    const transaction: Transaction = await this.transactionRepo.getTransactionByTransactionRef(transactionRef);
    if (
      transaction === null ||
      (transaction.debitConsumerID !== consumerID && transaction.creditConsumerID !== consumerID)
    ) {
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
    return await this.transactionRepo.getFilteredTransactions(filter);
  }

  async initiateTransaction(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
    sessionKey: string,
  ): Promise<Transaction> {
    // TODO: Add more validations around required amounts/currencies
    if (!initiatingConsumer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Must have consumer to initiate transaction",
      });
    }
    const workflowImpl = this.transactionFactory.getWorkflowImplementation(transactionDetails.workflowName);

    transactionDetails = await workflowImpl.preprocessTransactionParams(transactionDetails, initiatingConsumer);

    const transaction: InputTransaction = {
      creditAmount: transactionDetails.creditAmount,
      creditCurrency: transactionDetails.creditCurrency,
      debitAmount: transactionDetails.debitAmount,
      debitCurrency: transactionDetails.debitCurrency,
      exchangeRate: transactionDetails.exchangeRate,
      workflowName: transactionDetails.workflowName,
      memo: transactionDetails.memo,
      sessionKey: sessionKey,
      transactionRef: Utils.generateLowercaseUUID(true),
    };

    try {
      // Ensure that consumers on both side of the transaction are in good standing
      if (transactionDetails.creditConsumerIDOrTag) {
        const consumer = await this.consumerService.getActiveConsumer(transactionDetails.creditConsumerIDOrTag);
        transaction.creditConsumerID = consumer.props.id;
      }

      if (transactionDetails.debitConsumerIDOrTag) {
        const consumer = await this.consumerService.getActiveConsumer(transactionDetails.debitConsumerIDOrTag);
        transaction.debitConsumerID = consumer.props.id;
      }
    } catch (error) {
      if (error instanceof ServiceException && error.errorCode === ServiceErrorCode.SEMANTIC_VALIDATION) {
        throw new ServiceException({
          // Rewrite semantic validations with the service's own terminology, otherwise let it bubble up
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Unable to execute transaction at this time as user is invalid or unable to perform transactions.",
        });
      } else {
        throw error;
      }
    }

    if (transaction.creditConsumerID === transaction.debitConsumerID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "debit & credit cannot be same entity",
      });
    }

    const savedTransaction: Transaction = await this.transactionRepo.createTransaction(transaction);

    // Perform sanctions check
    try {
      // If it passes, simple return. If it fails, an exception will be thrown
      await this.validateForSanctions(initiatingConsumer, savedTransaction);
    } catch (e) {
      if (e instanceof ServiceException) {
        await this.transactionRepo.updateTransactionByTransactionID(savedTransaction.id, {
          status: TransactionStatus.FAILED,
        });
        throw e;
      }
    }

    await workflowImpl.initiateWorkflow(savedTransaction);

    return savedTransaction;
  }

  async calculateExchangeRate(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
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

    const exchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(
      amountCurrency,
      desiredCurrency,
    );

    if (!exchangeRateDTO) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: "No exchange rate found for currency pair",
      });
    }

    const exchangeRate = exchangeRateDTO.nobaRate;
    let desiredAmount = 0;
    let desiredAmountWithFees = 0;
    if (desiredCurrency === Currency.COP) {
      desiredAmount = amount * exchangeRate;
      desiredAmountWithFees = desiredAmount - 1.19 * (0.0265 * desiredAmount + 900);
    } else {
      desiredAmount = amount * exchangeRate;
      const baseCurrencyWithFees = amount - 1.19 * (0.0265 * amount + 900);
      desiredAmountWithFees = baseCurrencyWithFees * exchangeRate;
    }

    return {
      quoteAmount: Utils.roundTo2DecimalString(desiredAmount),
      quoteAmountWithFees: Utils.roundTo2DecimalString(desiredAmountWithFees),
      exchangeRate: exchangeRate.toString(),
    };
  }

  async updateTransaction(transactionID: string, transactionDetails: UpdateTransactionDTO): Promise<Transaction> {
    const transaction = await this.transactionRepo.getTransactionByID(transactionID);
    if (!transaction) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.DOES_NOT_EXIST,
        message: "Transaction does not exist",
      });
    }

    // Only allow these two fields to be updated. Others are more sensitive and get updated by other methods.
    const transactionUpdate: UpdateTransaction = {
      ...(transactionDetails.status !== undefined && { status: transactionDetails.status }),
    };

    return await this.transactionRepo.updateTransactionByTransactionID(transactionID, transactionUpdate);
  }

  private async validateForSanctions(consumerID: string, transaction: Transaction) {
    // Check Sardine for sanctions
    const sardineTransactionInformation: TransactionVerification = {
      transactionID: transaction.id,
      debitConsumerID: transaction.debitConsumerID,
      creditConsumerID: transaction.creditConsumerID,
      workflowName: transaction.workflowName,
      debitAmount: transaction.debitAmount,
      debitCurrency: transaction.debitCurrency,
      creditAmount: transaction.creditAmount,
      creditCurrency: transaction.creditCurrency,
    };

    const consumer = await this.consumerService.getConsumer(consumerID);
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

      this.addTransactionEvent(transaction.id, {
        message: "Transaction has been detected to be high risk",
      });

      throw new ServiceException({
        errorCode: ServiceErrorCode.UNABLE_TO_PROCESS,
      });
    }
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

  async debitFromBank(request: DebitBankRequestDTO): Promise<DebitBankResponseDTO> {
    const [transaction, withdrawal] = await Promise.all([
      this.getTransactionByTransactionID(request.transactionID),
      this.getWithdrawalDetails(request.transactionID),
    ]);
    if (!transaction) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Transaction not found: ${request.transactionID}`,
      });
    }
    if (!withdrawal) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: `Withdrawal details not found: ${request.transactionID}`,
      });
    }

    const bank = this.bankFactory.getBankImplementation(request.bankName);
    const debitBankResponse = await bank.debit({
      amount: request.amount,
      currency: request.currency,
      consumerID: transaction.creditConsumerID, // Is the consumer being credited in this transaction?
      transactionID: request.transactionID,
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
