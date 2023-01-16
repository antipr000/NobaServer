import { Inject, Injectable } from "@nestjs/common";
import { InputTransaction, Transaction, UpdateTransaction, WorkflowName } from "./domain/Transaction";
import { TransactionFilterOptionsDTO } from "./dto/TransactionFilterOptionsDTO";
import { InitiateTransactionDTO } from "./dto/CreateTransactionDTO";
import { ITransactionRepo } from "./repo/transaction.repo";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { TRANSACTION_REPO_PROVIDER } from "./repo/transaction.repo.module";
import { Utils } from "../../core/utils/Utils";
import { ConsumerService } from "../consumer/consumer.service";
import { WorkflowExecutor } from "../../infra/temporal/workflow.executor";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";
import { PaginatedResult } from "../../core/infra/PaginationTypes";
import { Currency } from "./domain/TransactionTypes";
import { QuoteResponseDTO } from "./dto/QuoteResponseDTO";
import { ExchangeRateService } from "../common/exchangerate.service";
import { AddTransactionEventDTO, TransactionEventDTO } from "./dto/TransactionEventDTO";
import { InputTransactionEvent, TransactionEvent } from "./domain/TransactionEvent";
import { UpdateTransactionDTO } from "./dto/TransactionDTO";
import { MonoService } from "../psp/mono/mono.service";
import { MonoCurrency, MonoTransaction } from "../psp/domain/Mono";
import { ExchangeRateDTO } from "../common/dto/ExchangeRateDTO";

@Injectable()
export class TransactionService {
  constructor(
    @Inject(TRANSACTION_REPO_PROVIDER) private readonly transactionRepo: ITransactionRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly consumerService: ConsumerService,
    private readonly workflowExecutor: WorkflowExecutor,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly monoService: MonoService,
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
  ): Promise<string> {
    // TODO: Add more validations around required amounts/currencies
    if (!initiatingConsumer) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "Must have consumer to initiate transaction",
      });
    }

    switch (transactionDetails.workflowName) {
      case WorkflowName.WALLET_DEPOSIT:
        if (transactionDetails.creditConsumerIDOrTag) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditConsumerIDOrTag cannot be set for WALLET_DEPOSIT workflow",
          });
        }

        if (transactionDetails.creditAmount || transactionDetails.creditCurrency) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditAmount and creditCurrency cannot be set for WALLET_DEPOSIT workflow",
          });
        }

        if (transactionDetails.debitAmount <= 0) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitAmount must be greater than 0 for WALLET_DEPOSIT workflow",
          });
        }

        if (!transactionDetails.debitCurrency) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitCurrency must be set for WALLET_DEPOSIT workflow",
          });
        }

        transactionDetails.debitConsumerIDOrTag = initiatingConsumer;
        delete transactionDetails.creditConsumerIDOrTag;

        const exchangeRate: ExchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(
          transactionDetails.debitCurrency,
          Currency.USD,
        );

        transactionDetails.creditAmount = exchangeRate.nobaRate * transactionDetails.debitAmount;
        transactionDetails.creditCurrency = Currency.USD;
        transactionDetails.exchangeRate = exchangeRate.nobaRate;
        break;
      case WorkflowName.WALLET_WITHDRAWAL:
        if (transactionDetails.creditConsumerIDOrTag) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditConsumerIDOrTag cannot be set for WALLET_WITHDRAWAL workflow",
          });
        }

        if (transactionDetails.creditAmount || transactionDetails.creditCurrency) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditAmount and creditCurrency cannot be set for WALLET_WITHDRAWAL workflow",
          });
        }

        if (transactionDetails.debitAmount <= 0) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitAmount must be greater than 0 for WALLET_WITHDRAWAL workflow",
          });
        }

        if (!transactionDetails.debitCurrency) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitCurrency must be set for WALLET_WITHDRAWAL workflow",
          });
        }

        transactionDetails.debitConsumerIDOrTag = initiatingConsumer;
        transactionDetails.creditConsumerIDOrTag = undefined; // Gets populated with Noba master wallet
        transactionDetails.creditAmount = transactionDetails.debitAmount;
        transactionDetails.creditCurrency = transactionDetails.debitCurrency;
        transactionDetails.exchangeRate = 1;
        break;
      case WorkflowName.WALLET_TRANSFER:
        if (transactionDetails.debitConsumerIDOrTag) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitConsumerIDOrTag cannot be set for WALLET_TRANSFER workflow",
          });
        }

        if (transactionDetails.creditAmount || transactionDetails.creditCurrency) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditAmount and creditCurrency cannot be set for WALLET_TRANSFER workflow",
          });
        }

        if (transactionDetails.debitAmount <= 0) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitAmount must be greater than 0 for WALLET_TRANSFER workflow",
          });
        }

        if (!transactionDetails.debitCurrency) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitCurrency must be set for WALLET_TRANSFER workflow",
          });
        }

        transactionDetails.debitConsumerIDOrTag = initiatingConsumer; // Debit consumer must always be the current consumer
        transactionDetails.creditAmount = transactionDetails.debitAmount;
        transactionDetails.creditCurrency = transactionDetails.debitCurrency;
        transactionDetails.exchangeRate = 1;
        break;
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid workflow name",
        });
    }

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

    if (transactionDetails.creditConsumerIDOrTag) {
      let consumerID: string;
      if (transactionDetails.creditConsumerIDOrTag.startsWith("$")) {
        consumerID = await this.consumerService.findConsumerIDByHandle(transactionDetails.creditConsumerIDOrTag);
        if (!consumerID) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditConsumerIDOrTag is not a valid consumer",
          });
        }
      } else {
        const consumer = await this.consumerService.findConsumerById(transactionDetails.creditConsumerIDOrTag);
        if (!consumer) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditConsumerIDOrTag is not a valid consumer",
          });
        }

        consumerID = consumer.props.id;
      }

      transaction.creditConsumerID = consumerID;
    }

    if (transactionDetails.debitConsumerIDOrTag) {
      let consumerID: string;
      if (transactionDetails.debitConsumerIDOrTag.startsWith("$")) {
        consumerID = await this.consumerService.findConsumerIDByHandle(transactionDetails.debitConsumerIDOrTag);
        if (!consumerID) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitConsumerIDOrTag is not a valid consumer",
          });
        }
      } else {
        const consumer = await this.consumerService.findConsumerById(transactionDetails.debitConsumerIDOrTag);
        if (!consumer) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitConsumerIDOrTag is not a valid consumer",
          });
        }
        consumerID = consumer.props.id;
      }

      transaction.debitConsumerID = consumerID;
    }

    transaction.workflowName = transactionDetails.workflowName;

    const savedTransaction: Transaction = await this.transactionRepo.createTransaction(transaction);

    switch (transactionDetails.workflowName) {
      case WorkflowName.WALLET_TRANSFER:
        this.workflowExecutor.executeConsumerWalletTransferWorkflow(
          savedTransaction.debitConsumerID,
          savedTransaction.creditConsumerID,
          savedTransaction.debitAmount,
          savedTransaction.transactionRef,
        );
        break;
      case WorkflowName.WALLET_WITHDRAWAL:
        if (transaction.creditConsumerID && transaction.debitConsumerID) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "Both credit consumer and debit consumer cannot be set for a transaction",
          });
        }
        this.workflowExecutor.executeDebitConsumerWalletWorkflow(
          savedTransaction.debitConsumerID,
          savedTransaction.debitAmount,
          savedTransaction.transactionRef,
        );
        break;
      case WorkflowName.WALLET_DEPOSIT:
        if (transaction.creditConsumerID && transaction.debitConsumerID) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "Both credit consumer and debit consumer cannot be set for a transaction",
          });
        }

        // TODO: Add a check for the currency here. Mono should be called "only" for COP currencies.

        await this.monoService.createMonoTransaction({
          amount: savedTransaction.debitAmount,
          currency: savedTransaction.debitCurrency as MonoCurrency,
          consumerID: savedTransaction.creditConsumerID,
          nobaTransactionID: savedTransaction.id,
        });

        this.workflowExecutor.executeCreditConsumerWalletWorkflow(savedTransaction.id, savedTransaction.transactionRef);
        break;
      default:
        throw new ServiceException({
          // Shouldn't get here as validation done above, but good for completeness
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid workflow name",
        });
    }

    return savedTransaction.transactionRef;
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
      desiredAmount = amount / exchangeRate;
      desiredAmountWithFees = desiredAmount - 1.19 * (0.0265 * desiredAmount + 900);
    } else {
      desiredAmount = amount / exchangeRate;
      const baseCurrencyWithFees = amount - 1.19 * (0.0265 * amount + 900);
      desiredAmountWithFees = baseCurrencyWithFees / exchangeRate;
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

  async getTransactionEvents(transactionID: string, includeInternalEvents: boolean): Promise<TransactionEvent[]> {
    const transactionEvents: TransactionEvent[] = await this.transactionRepo.getTransactionEvents(
      transactionID,
      includeInternalEvents,
    );
    return transactionEvents;
  }
}
