/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class VerificationWebhooksService {
  /**
   * @returns any
   * @throws ApiError
   */
  public static postDocumentVerificationResult(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/webhook/document/result",
    });
  }

  /**
   * @returns any
   * @throws ApiError
   */
  public static postCaseNotification(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/webhook/case/notification",
    });
  }
}
