import { Injectable } from "@nestjs/common";
import { HealthCheckResponse } from "src/core/domain/HealthCheckTypes";
import { IClient } from "src/core/domain/IClient";

@Injectable()
export class StubExchangeRateClient implements IClient {
  getHealth(): Promise<HealthCheckResponse> {
    throw new Error("Method not implemented.");
  }

  getExchangeRate(): Promise<number> {
    return Promise.resolve(4000);
  }
}
