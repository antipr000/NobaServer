import { QuoteResponseDTO } from "test/api_client";
import { TransactionFlags } from "../../domain/TransactionFlags";
import { Currency } from "../../domain/TransactionTypes";

export interface TransactionQuoteProvider {
  getQuote(
    amount: number,
    amountCurrency: Currency,
    desiredCurrency: Currency,
    options?: TransactionFlags[],
  ): Promise<QuoteResponseDTO>;
}
