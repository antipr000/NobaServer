import { Inject, Injectable } from "@nestjs/common";
import { Transaction } from "./domain/Transaction";
import { Consumer } from "../consumer/domain/Consumer";
import { TransactionFilterOptions } from "../transactions/domain/Types";
import { InitiateTransactionDTO } from "./dto/CreateTransactionDTO";
import { WorkflowExecutor } from "src/infra/temporal/workflow.executor";
import { WorkflowType } from "./domain/TransactionTypes";
import { ServiceErrorCode, ServiceException } from "../../core/exception/ServiceException";

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
    switch (orderDetails.workflowName) {
      case WorkflowType.CONSUMER_FUNDS_TRANSFER:
        return this.workflowExecutor.executeConsumerFundsTransferWorkflow(
          orderDetails.debitConsumerIDOrTag,
          orderDetails.creditConsumerIDOrTag,
          orderDetails.debitAmount,
          Date.now().toString(), // TODO: What should the workflow ID be?
        );
        break;
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
