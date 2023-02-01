import { TransactionFlags } from "../domain/TransactionFlags";
import { Transaction } from "../domain/Transaction";
import { Currency } from "../domain/TransactionTypes";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { QuoteResponseDTO } from "../dto/QuoteResponseDTO";
import { ProcessedTransactionDTO } from "../dto/ProcessedTransactionDTO";

export interface IWorkflowImpl {
  preprocessTransactionParams(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
  ): Promise<ProcessedTransactionDTO>;

  initiateWorkflow(transaction: Transaction, options?: TransactionFlags[]): Promise<void>;

  getTransactionQuote(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    options?: TransactionFlags[],
  ): Promise<QuoteResponseDTO>;
}
