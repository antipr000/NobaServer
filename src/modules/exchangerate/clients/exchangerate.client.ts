import { IClient } from "../../../core/domain/IClient";

export interface IExchangeRateClient extends IClient {
  getExchangeRate(): Promise<number>;
}
