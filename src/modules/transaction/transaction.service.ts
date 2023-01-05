import { Inject, Injectable } from "@nestjs/common";
import { Transaction, WorkflowName } from "./domain/Transaction";
import { Consumer } from "../consumer/domain/Consumer";
import { TransactionFilterOptionsDTO } from "./dto/TransactionFilterOptionsDTO";
import { InitiateTransactionDTO } from "./dto/CreateTransactionDTO";
import { ITransactionRepo } from "./repo/transaction.repo";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { TRANSACTION_REPO_PROVIDER } from "./repo/transaction.repo.module";
import { Utils } from "../../core/utils/Utils";
import { ConsumerService } from "../consumer/consumer.service";
import { BadRequestError } from "../../core/exception/CommonAppException";
import { WorkflowExecutor } from "../../infra/temporal/workflow.executor";
import { Entity } from "../../core/domain/Entity";
import { v4 } from "uuid";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";

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
      return null;
    }
    return transaction;
  }

  async getFilteredTransactions(filter: TransactionFilterOptionsDTO): Promise<Transaction[]> {
    throw new Error("Not implemented!");
  }

  async initiateTransaction(
    orderDetails: InitiateTransactionDTO,
    consumer: Consumer,
    sessionKey: string,
  ): Promise<string> {
    let transaction: Transaction;
    transaction.id = Entity.getNewID();
    transaction.transactionRef = Utils.generateLowercaseUUID(true);
    if (orderDetails.creditConsumerIDOrTag) {
      let consumerID: string;
      if (orderDetails.creditConsumerIDOrTag.startsWith("$")) {
        consumerID = await this.consumerService.findConsumerIDByHandle(orderDetails.creditConsumerIDOrTag);
      } else {
        consumerID = orderDetails.creditConsumerIDOrTag;
      }

      transaction.creditConsumerID = consumerID;
    }

    if (orderDetails.debitConsumerIDOrTag) {
      let consumerID: string;
      if (orderDetails.debitConsumerIDOrTag.startsWith("$")) {
        consumerID = await this.consumerService.findConsumerIDByHandle(orderDetails.debitConsumerIDOrTag);
      } else {
        consumerID = orderDetails.debitConsumerIDOrTag;
      }

      transaction.debitConsumerID = consumerID;
    }

    if (transaction.creditConsumerID && transaction.debitConsumerID) {
      throw new BadRequestError({
        message: "Both credit consumer and debit consumer cannot be set for a transaction",
      });
    }

    if (!transaction.creditConsumerID && !transaction.debitConsumerID) {
      throw new BadRequestError({
        message: "One of credit consumer id or debit consumer id must be set",
      });
    }

    transaction.creditAmount = orderDetails.creditAmount ?? null;
    transaction.creditCurrency = orderDetails.creditCurrency ?? null;
    transaction.debitAmount = orderDetails.debitAmount ?? null;
    transaction.debitCurrency = orderDetails.debitCurrency ?? null;

    transaction.workflowName = orderDetails.workflowName;
    const savedTransaction = await this.transactionRepo.createTransaction(transaction);

    const transactionID = v4();

    switch (orderDetails.workflowName) {
      case WorkflowName.CONSUMER_WALLET_TRANSFER:
        return this.workflowExecutor.executeConsumerWalletTransferWorkflow(
          orderDetails.debitConsumerIDOrTag,
          orderDetails.creditConsumerIDOrTag,
          orderDetails.debitAmount,
          transactionID,
        );
      case WorkflowName.DEBIT_CONSUMER_WALLET:
        return this.workflowExecutor.executeDebitConsumerWalletWorkflow(
          consumer.props.id,
          orderDetails.debitAmount,
          transactionID,
        );
      case WorkflowName.CREDIT_CONSUMER_WALLET:
        return this.workflowExecutor.executeCreditConsumerWalletWorkflow(
          consumer.props.id,
          orderDetails.creditAmount,
          transactionID,
        );
      default:
        throw new ServiceException({
          errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
          message: "Invalid workflow type",
        });
    }
    return savedTransaction.transactionRef;
  }

  async calculateExchangeRate(baseCurrency: string, targetCurrency: string): Promise<string> {
    throw new Error("Not implemented!");
  }
}
