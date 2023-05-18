import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { IWorkflowImpl } from "./iworkflow.impl";
import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { Currency } from "../domain/TransactionTypes";
import { WorkflowExecutor } from "../../../infra/temporal/workflow.executor";
import { Transaction } from "../domain/Transaction";
import { TransactionFlags } from "../domain/TransactionFlags";
import { QuoteResponseDTO } from "../dto/QuoteResponseDTO";
import { ProcessedTransactionDTO } from "../dto/ProcessedTransactionDTO";

export class CreditAdjustmentImpl implements IWorkflowImpl {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly workflowExecutor: WorkflowExecutor,
  ) {}

  async preprocessTransactionParams(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
  ): Promise<ProcessedTransactionDTO> {
    throw new ServiceException({
      errorCode: ServiceErrorCode.NOT_IMPLEMENTED,
      message: "Processing params not supported for this workflow",
    });
  }

  async initiateWorkflow(transaction: Transaction, options?: TransactionFlags[]): Promise<void> {
    await this.workflowExecutor.executeCreditAdjustmentWorkflow(transaction.id, transaction.transactionRef);
  }

  async getTransactionQuote(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    options?: TransactionFlags[],
  ): Promise<QuoteResponseDTO> {
    throw new ServiceException({
      errorCode: ServiceErrorCode.NOT_IMPLEMENTED,
      message: "Transaction quote not supported for this workflow",
    });
  }
}
