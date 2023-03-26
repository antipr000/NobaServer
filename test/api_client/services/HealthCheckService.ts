/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HealthCheckResponseDTO } from "../models/HealthCheckResponseDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class HealthCheckService {
  /**
   * Checks if the Noba service is up and running
   * @returns HealthCheckResponseDTO Health status of the Noba service
   * @throws ApiError
   */
  public static appHealth({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    depth,
  }: {
    xNobaApiKey: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
    depth?: "SHALLOW" | "DEEP";
  }): CancelablePromise<HealthCheckResponseDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/health",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        depth: depth,
      },
    });
  }
}
