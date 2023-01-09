import { Inject, Injectable } from "@nestjs/common";
import { InputTransaction, Transaction, WorkflowName } from "./domain/Transaction";
import { Consumer } from "../consumer/domain/Consumer";
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

@Injectable()
export class TransactionService {
  constructor(
    @Inject(TRANSACTION_REPO_PROVIDER) private readonly transactionRepo: ITransactionRepo,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly consumerService: ConsumerService,
    private readonly workflowExecutor: WorkflowExecutor,
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

  async getFilteredTransactions(filter: TransactionFilterOptionsDTO): Promise<PaginatedResult<Transaction>> {
    return await this.transactionRepo.getFilteredTransactions(filter);
  }

  async initiateTransaction(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: Consumer,
    sessionKey: string,
  ): Promise<string> {
    // Validate and populate defaults
    switch (transactionDetails.workflowName) {
      case WorkflowName.CREDIT_CONSUMER_WALLET:
        if (transactionDetails.debitConsumerIDOrTag) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitConsumerIDOrTag cannot be set for CREDIT_CONSUMER_WALLET workflow",
          });
        }

        if (transactionDetails.debitAmount || transactionDetails.debitCurrency) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitAmount and debitCurrency cannot be set for CREDIT_CONSUMER_WALLET workflow",
          });
        }

        transactionDetails.debitConsumerIDOrTag = undefined; // Gets populated with Noba master wallet
        transactionDetails.creditConsumerIDOrTag = initiatingConsumer.props.id;
        transactionDetails.debitAmount = transactionDetails.creditAmount;
        transactionDetails.debitCurrency = transactionDetails.creditCurrency;
        transactionDetails.exchangeRate = 1;
        break;
      case WorkflowName.DEBIT_CONSUMER_WALLET:
        if (transactionDetails.creditConsumerIDOrTag) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditConsumerIDOrTag cannot be set for DEBIT_CONSUMER_WALLET workflow",
          });
        }

        if (transactionDetails.creditAmount || transactionDetails.creditCurrency) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "creditAmount and creditCurrency cannot be set for DEBIT_CONSUMER_WALLET workflow",
          });
        }

        transactionDetails.debitConsumerIDOrTag = initiatingConsumer.props.id;
        transactionDetails.creditConsumerIDOrTag = undefined; // Gets populated with Noba master wallet
        transactionDetails.creditAmount = transactionDetails.debitAmount;
        transactionDetails.creditCurrency = transactionDetails.debitCurrency;
        transactionDetails.exchangeRate = 1;
        break;
      case WorkflowName.CONSUMER_WALLET_TRANSFER:
        if (transactionDetails.debitConsumerIDOrTag) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitConsumerIDOrTag cannot be set for CONSUMER_WALLET_TRANSFER workflow",
          });
        }

        if (transactionDetails.debitAmount || transactionDetails.debitCurrency) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "debitAmount and debitCurrency cannot be set for CONSUMER_WALLET_TRANSFER workflow",
          });
        }

        transactionDetails.debitConsumerIDOrTag = initiatingConsumer.props.id; // Debit consumer must always be the current consumer
        transactionDetails.debitAmount = transactionDetails.creditAmount;
        transactionDetails.debitCurrency = transactionDetails.creditCurrency;
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
      transactionRef: Utils.generateLowercaseUUID(true),
    };

    console.log("transaction", transaction);

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

    if (!transaction.creditConsumerID && !transaction.debitConsumerID) {
      throw new ServiceException({
        errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
        message: "One of credit consumer id or debit consumer id must be set",
      });
    }

    transaction.workflowName = transactionDetails.workflowName;
    const savedTransaction: Transaction = await this.transactionRepo.createTransaction(transaction);

    switch (transactionDetails.workflowName) {
      case WorkflowName.CONSUMER_WALLET_TRANSFER:
        this.workflowExecutor.executeConsumerWalletTransferWorkflow(
          savedTransaction.debitConsumerID,
          savedTransaction.creditConsumerID,
          savedTransaction.debitAmount,
          savedTransaction.transactionRef,
        );
        break;
      case WorkflowName.DEBIT_CONSUMER_WALLET:
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
      case WorkflowName.CREDIT_CONSUMER_WALLET:
        if (transaction.creditConsumerID && transaction.debitConsumerID) {
          throw new ServiceException({
            errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
            message: "Both credit consumer and debit consumer cannot be set for a transaction",
          });
        }
        this.workflowExecutor.executeCreditConsumerWalletWorkflow(
          savedTransaction.creditConsumerID,
          savedTransaction.creditAmount,
          savedTransaction.transactionRef,
        );
        break;
      default:
        throw new ServiceException({
          // Shouldn't get here as validation done above, but good for completness
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid workflow name",
        });
    }

    return savedTransaction.transactionRef;
  }

  async calculateExchangeRate(baseCurrency: string, targetCurrency: string): Promise<string> {
    throw new Error("Not implemented!");
  }
}
