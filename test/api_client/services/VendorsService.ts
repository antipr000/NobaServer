/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class VendorsService {
  /**
   * Checks if the transaction parameters are valid
   * @returns any
   * @throws ApiError
   */
  public static consumePaymentWebhooks(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/vendors/checkout/webhooks",
    });
  }
}
