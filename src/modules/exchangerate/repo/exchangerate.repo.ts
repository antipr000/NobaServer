import { ExchangeRate, InputExchangeRate } from "../domain/ExchangeRate";

export interface IExchangeRateRepo {
  createExchangeRate(exchangeRate: InputExchangeRate): Promise<ExchangeRate>;
  getExchangeRateForCurrencyPair(
    numeratorCurrency: string,
    denominatorCurrency: string,
    expirationFilter?: Date,
  ): Promise<ExchangeRate>;
}
