import { Injectable } from "@nestjs/common";
import { HealthCheckResponse } from "../../../core/domain/HealthCheckTypes";
import { IExchangeRateClient } from "./exchangerate.client";

@Injectable()
export class StubExchangeRateClient implements IExchangeRateClient {
  getHealth(): Promise<HealthCheckResponse> {
    throw new Error("Method not implemented.");
  }

  async getExchangeRate(numeratorCurrency: string, denominatorCurrency: string): Promise<number> {
    if (numeratorCurrency === "USD" && denominatorCurrency === "COP") {
      return Promise.resolve(4000);
    }
    if (numeratorCurrency === "COP" && denominatorCurrency === "USD") {
      return Promise.resolve(0.00025);
    }

    throw new Error("Unsupported currency pair");
  }
}
