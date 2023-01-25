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
import { MonoCurrency } from "../psp/domain/Mono";
import { ExchangeRateDTO } from "../common/dto/ExchangeRateDTO";
import { TransactionVerification } from "../verification/domain/TransactionVerification";
import { VerificationService } from "../verification/verification.service";
import { KYCStatus } from "@prisma/client";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";

@Injectable()
export class TransactionService {
  private depositFeeAmount: number;
  private depositFeePercentage: number;

  constructor(
    @Inject(TRANSACTION_REPO_PROVIDER) private readonly transactionRepo: ITransactionRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: CustomConfigService,
    private readonly consumerService: ConsumerService,
    private readonly workflowExecutor: WorkflowExecutor,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly verificationService: VerificationService,
    private readonly monoService: MonoService,
  ) {
    this.depositFeeAmount = this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.depositFeeAmount;
    this.depositFeePercentage = this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).transaction.depositFeePercentage;
  }

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

        // COP limitation is temporary until we support other currencies
        if (!transactionDetails.debitCurrency || transactionDetails.debitCurrency !== Currency.COP) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitCurrency must be set for WALLET_DEPOSIT workflow and must be COP",
          });
        }

        transactionDetails.creditCurrency = Currency.USD;
        transactionDetails.debitConsumerIDOrTag = initiatingConsumer;
        delete transactionDetails.creditConsumerIDOrTag;

        const exchangeRateToUSD: ExchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(
          transactionDetails.debitCurrency,
          transactionDetails.creditCurrency,
        );

        if (!exchangeRateToUSD) {
          this.logger.error(
            `Database is not seeded properly. Could not find exchange rate for ${transactionDetails.debitCurrency} - ${Currency.USD}`,
          );
          throw new ServiceException({
            errorCode: ServiceErrorCode.UNKNOWN, // 500 error because even though it's "known", it's not expected
            message: "Could not find exchange rate",
          });
        }

        transactionDetails.creditAmount = exchangeRateToUSD.nobaRate * transactionDetails.debitAmount;
        transactionDetails.exchangeRate = exchangeRateToUSD.nobaRate;
        break;
      case WorkflowName.WALLET_WITHDRAWAL:
        /* 
          For a withdrawal, the following are true:
           1. We set the debitConsumerIDOrTag to the initiating consumer (the consumer who is withdrawing)
           2. CreditConsumerIDOrTag will never be set
           3. Debit-side amount must be provided but currency will always be USD
           4. Credit-side currency must be provided but credit amount will always be calculated
        */
        if (transactionDetails.creditConsumerIDOrTag) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditConsumerIDOrTag cannot be set for WALLET_WITHDRAWAL workflow",
          });
        }

        if (transactionDetails.creditAmount) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditAmount cannot be set for WALLET_WITHDRAWAL workflow",
          });
        }

        if (transactionDetails.debitCurrency) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitCurrency cannot be set for WALLET_WITHDRAWAL workflow",
          });
        }

        if (transactionDetails.debitAmount <= 0) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitAmount must be greater than 0 for WALLET_WITHDRAWAL workflow",
          });
        }

        if (!transactionDetails.creditCurrency) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditCurrency must be set for WALLET_WITHDRAWAL workflow",
          });
        }

        transactionDetails.debitCurrency = Currency.USD;
        transactionDetails.debitConsumerIDOrTag = initiatingConsumer;
        delete transactionDetails.creditConsumerIDOrTag;

        const exchangeRateFromUSD: ExchangeRateDTO = await this.exchangeRateService.getExchangeRateForCurrencyPair(
          transactionDetails.debitCurrency,
          transactionDetails.creditCurrency,
        );

        if (!exchangeRateFromUSD) {
          this.logger.error(
            `Database is not seeded properly. Could not find exchange rate for ${Currency.USD} - ${transactionDetails.debitCurrency}`,
          );
          throw new ServiceException({
            errorCode: ServiceErrorCode.UNKNOWN, // 500 error because even though it's "known", it's not expected
            message: "Could not find exchange rate",
          });
        }

        transactionDetails.creditAmount = exchangeRateFromUSD.nobaRate * transactionDetails.debitAmount;
        transactionDetails.exchangeRate = exchangeRateFromUSD.nobaRate;
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
            message: "Both credit consumer and debit consumer cannot be set for this type of transaction",
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
            message: "Both credit consumer and debit consumer cannot be set for this type of transaction",
          });
        }

        // TODO: Add a check for the currency here. Mono should be called "only" for COP currencies.
        await this.monoService.createMonoTransaction({
          amount: savedTransaction.debitAmount,
          currency: savedTransaction.debitCurrency as MonoCurrency,
          consumerID: savedTransaction.debitConsumerID,
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

    return savedTransaction;
  }

  async calculateExchangeRate(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    workflowName: WorkflowName,
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

    /* Investigate: 
    - Add global parameters to control processing fees
    - Add global parameters to control noba fees
    - Add consumer check for user promos
    - Add tier based fees
    */

    const nobaRate = exchangeRateDTO.nobaRate;

    let res: QuoteResponseDTO;

    switch (workflowName) {
      case WorkflowName.WALLET_TRANSFER:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Wallet transfer not valid workflow for quote",
        });
      case WorkflowName.WALLET_WITHDRAWAL:
        if (desiredCurrency === Currency.COP) {
          // Noba rate = 5000
          const nobaFeeUSD = Math.min(amount * this.depositFeePercentage, this.depositFeeAmount);
          const nobaFeeCOP = nobaFeeUSD * nobaRate;

          const processingFeeCOP = 2975;
          const processingFeeUSD = processingFeeCOP / nobaRate;

          // Do fees get calculated postExchange or preExchange?
          const postExchangeAmount = amount * nobaRate;
          const postExchangeAmountWithBankFees = postExchangeAmount - nobaFeeCOP - processingFeeCOP;

          res = {
            nobaFee: Utils.roundTo2DecimalString(nobaFeeUSD),
            processingFee: Utils.roundTo2DecimalString(processingFeeUSD),
            totalFee: Utils.roundTo2DecimalString(nobaFeeUSD + processingFeeUSD),
            quoteAmount: Utils.roundTo2DecimalString(postExchangeAmount),
            quoteAmountWithFees: Utils.roundTo2DecimalString(postExchangeAmountWithBankFees),
            nobaRate: Utils.roundTo2DecimalString(nobaRate),
          };
        } else {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "Non-COP withdrawal not supported",
          });
        }

        break;
      case WorkflowName.WALLET_DEPOSIT:
        if (desiredCurrency === Currency.COP) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "COP deposit not supported",
          });
        } else {
          // nobaRate = 1/5000
          const bankFeeCOP = 0.031535 * amount + 1071;
          const bankFeeUSD = bankFeeCOP * nobaRate;
          const nobaFeeUSD = Math.min(amount * nobaRate * this.depositFeePercentage, this.depositFeeAmount);
          const nobaFeeCOP = nobaFeeUSD / nobaRate;

          const postBankAmount = amount - bankFee;
          desiredAmountWithBankFees = postBankAmount / nobaRate;
        }
        break;
    }

    return {
      quoteAmount: Utils.roundTo2DecimalString(desiredAmount),
      quoteAmountWithFees: Utils.roundTo2DecimalString(desiredAmount),
      nobaRate: nobaRate.toString(),
      processingFee: processingFee.toString(),
      nobaFee: nobaFee.toString(),
      totalFee: totalFee.toString(),
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

  async getTransactionEvents(transactionID: string, includeInternalEvents: boolean): Promise<TransactionEvent[]> {
    const transactionEvents: TransactionEvent[] = await this.transactionRepo.getTransactionEvents(
      transactionID,
      includeInternalEvents,
    );
    return transactionEvents;
  }
}
