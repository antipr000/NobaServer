import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { IWorkflowImpl } from "./iworkflow.impl";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/ServiceException";
import { Transaction } from "../domain/Transaction";
import { Inject } from "@nestjs/common";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";

export class WalletTransferImpl implements IWorkflowImpl {
  @Inject()
  private readonly workflowExecutor: WorkflowExecutor;

  async preprocessTransactionParams(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
  ): Promise<InitiateTransactionDTO> {
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

    return transactionDetails;
  }

  async initiateWorkflow(transaction: Transaction): Promise<void> {
    this.workflowExecutor.executeConsumerWalletTransferWorkflow(
      transaction.debitConsumerID,
      transaction.creditConsumerID,
      transaction.debitAmount,
      transaction.transactionRef,
    );
  }
}
