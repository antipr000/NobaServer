import { IClient } from "../../../core/domain/IClient";

export interface IExchangeRateClient extends IClient {
  getExchangeRate(numeratorCurrency: string, denominatorCurrency: string): Promise<number>;
}
