import { ExchangeRateFlags } from "../domain/ExchangeRateFlags";
import { Transaction, WorkflowName } from "../domain/Transaction";
import { Currency } from "../domain/TransactionTypes";
import { InitiateTransactionDTO } from "../dto/CreateTransactionDTO";
import { QuoteResponseDTO } from "../dto/QuoteResponseDTO";

export interface IWorkflowImpl {
  preprocessTransactionParams(
    transactionDetails: InitiateTransactionDTO,
    initiatingConsumer: string,
  ): Promise<InitiateTransactionDTO>;

  initiateWorkflow(transaction: Transaction): Promise<void>;

  getTransactionQuote(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    exchangeRateFlags?: ExchangeRateFlags[],
  ): Promise<QuoteResponseDTO>;
}
