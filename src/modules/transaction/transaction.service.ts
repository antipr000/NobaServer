import { Inject, Injectable } from "@nestjs/common";
import { Transaction } from "./domain/Transaction";
import { Consumer } from "../consumer/domain/Consumer";
import { TransactionFilterOptions } from "../transactions/domain/Types";
import { InitiateTransactionDTO } from "./dto/CreateTransactionDTO";
import { WorkflowExecutor } from "src/infra/temporal/workflow.executor";
import { WorkflowType } from "./domain/TransactionTypes";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";
import { uuid } from "uuidv4";

@Injectable()
export class TransactionService {
  @Inject()
  private readonly workflowExecutor: WorkflowExecutor;

  async getTransaction(transactionRef: string, consumerID: string): Promise<Transaction> {
    throw new Error("Not implemented!");
  }

  async getFilteredTransactions(filter: TransactionFilterOptions): Promise<Transaction[]> {
    throw new Error("Not implemented!");
  }

  async initiateTransaction(
    orderDetails: InitiateTransactionDTO,
    consumer: Consumer,
    sessionKey: string,
  ): Promise<string> {
    // TODO: Create a transaction object and save it to the DB
    const transactionID = uuid();

    switch (orderDetails.workflowName) {
      case WorkflowType.CONSUMER_WALLET_TRANSFER:
        return this.workflowExecutor.executeConsumerWalletTransferWorkflow(
          orderDetails.debitConsumerIDOrTag,
          orderDetails.creditConsumerIDOrTag,
          orderDetails.debitAmount,
          transactionID,
        );
      case WorkflowType.DEBIT_CONSUMER_WALLET:
        return this.workflowExecutor.executeDebitConsumerWalletWorkflow(
          consumer.props.id,
          orderDetails.debitAmount,
          transactionID,
        );
      case WorkflowType.CREDIT_CONSUMER_WALLET:
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
  }

  async calculateExchangeRate(baseCurrency: string, targetCurrency: string): Promise<string> {
    throw new Error("Not implemented!");
  }
}
