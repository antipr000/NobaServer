/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class HealthCheckService {
  /**
   * Checks if the Noba service is up and running
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @returns any Health status of the Noba service
   * @throws ApiError
   */
  public static appHealth(xNobaApiKey: string, xNobaSignature: string, xNobaTimestamp: string): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/health",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
    });
  }
}
