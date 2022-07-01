/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class HealthCheckService {
  /**
   * Checks if the service is up and running
   * @returns any Status OK
   * @throws ApiError
   */
  public static appHealth(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/health",
    });
  }
}
