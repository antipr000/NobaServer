import { HealthCheckResponse } from "./HealthCheckTypes";

/**
 * @interface IClient
 * @description Interface for external client implementations
 */

export interface IClient {
  getHealth(): Promise<HealthCheckResponse>;
}
