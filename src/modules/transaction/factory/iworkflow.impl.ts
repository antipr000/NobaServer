import { TransactionFlags } from "../domain/TransactionFlags";
import { Transaction, WorkflowName } from "../domain/Transaction";
import { Currency } from "../domain/TransactionTypes";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { QuoteResponseDTO } from "../dto/QuoteResponseDTO";

export interface IWorkflowImpl {
  preprocessTransactionParams(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
  ): Promise<InitiateTransactionDTO>;

  initiateWorkflow(transaction: Transaction, options?: TransactionFlags[]): Promise<void>;

  getTransactionQuote(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    options?: TransactionFlags[],
  ): Promise<QuoteResponseDTO>;
}
