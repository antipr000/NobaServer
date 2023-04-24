import { IClient } from "../../../core/domain/IClient";

export interface IExchangeRateClient extends IClient {
  // 1 numeratorCurrency = X denominatorCurrency
  getExchangeRate(numeratorCurrency: string, denominatorCurrency: string): Promise<number>;
}
