import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { IWorkflowImpl } from "./iworkflow.impl";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { InputTransaction, Transaction } from "../domain/Transaction";
import { Inject } from "@nestjs/common";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { TransactionFlags } from "../domain/TransactionFlags";
import { Currency } from "../domain/TransactionTypes";
import { QuoteResponseDTO } from "../dto/QuoteResponseDTO";
import { Utils } from "../../../core/utils/Utils";

export class WalletTransferImpl implements IWorkflowImpl {
  @Inject()
  private readonly workflowExecutor: WorkflowExecutor;

  async preprocessTransactionParams(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
  ): Promise<InputTransaction> {
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

    const transaction: InputTransaction = {
      creditAmount: transactionDetails.creditAmount,
      creditCurrency: transactionDetails.creditCurrency,
      debitAmount: transactionDetails.debitAmount,
      debitCurrency: transactionDetails.debitCurrency,
      exchangeRate: transactionDetails.exchangeRate,
      workflowName: transactionDetails.workflowName,
      memo: transactionDetails.memo,
      transactionRef: Utils.generateLowercaseUUID(true),
      transactionFees: [],
    };

    return transaction;
  }

  async initiateWorkflow(transaction: Transaction, options?: TransactionFlags[]): Promise<void> {
    this.workflowExecutor.executeConsumerWalletTransferWorkflow(
      transaction.debitConsumerID,
      transaction.creditConsumerID,
      transaction.debitAmount,
      transaction.transactionRef,
    );
  }

  async getTransactionQuote(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    options?: TransactionFlags[],
  ): Promise<QuoteResponseDTO> {
    throw new ServiceException({
      errorCode: ServiceErrorCode.SEMANTIC_VALIDATION,
      message: "Wallet transfer is not a valid workflow for quote",
    });
  }
}
