import { Injectable } from "@nestjs/common";
import { HealthCheckResponse } from "../../../core/domain/HealthCheckTypes";
import { IExchangeRateClient } from "./exchangerate.client";

@Injectable()
export class StubExchangeRateClient implements IExchangeRateClient {
  getHealth(): Promise<HealthCheckResponse> {
    throw new Error("Method not implemented.");
  }

  getExchangeRate(): Promise<number> {
    return Promise.resolve(4000);
  }
}
