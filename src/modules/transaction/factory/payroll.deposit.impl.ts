import { TransactionFlags } from "../domain/TransactionFlags";
import { Transaction } from "../domain/Transaction";
import { Currency } from "../domain/TransactionTypes";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { QuoteResponseDTO } from "../dto/QuoteResponseDTO";
import { ProcessedTransactionDTO } from "../dto/ProcessedTransactionDTO";
import { IWorkflowImpl } from "./iworkflow.impl";
import { Inject, Injectable } from "@nestjs/common";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";

@Injectable()
export class PayrollDepositImpl implements IWorkflowImpl {
  async preprocessTransactionParams(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
  ): Promise<ProcessedTransactionDTO> {
    throw new ServiceException({
      errorCode: ServiceErrorCode.NOT_IMPLEMENTED,
      message: "Call 'initiateTransactionForPayrolls' instead for time being.",
    });
  }

  async initiateWorkflow(transaction: Transaction, options?: TransactionFlags[]): Promise<void> {
    // No action required as the workflow creation is internally handled by NobaWorkflow
    // during the execution of the PAYROLL_DEPOSIT parent Workflow.
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
