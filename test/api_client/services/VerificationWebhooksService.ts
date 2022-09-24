/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CaseNotificationWebhookRequestDTO } from "../models/CaseNotificationWebhookRequestDTO";
import type { DocumentVerificationWebhookRequestDTO } from "../models/DocumentVerificationWebhookRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class VerificationWebhooksService {
  /**
   * @returns any
   * @throws ApiError
   */
  public static postDocumentVerificationResult({
    requestBody,
  }: {
    requestBody: DocumentVerificationWebhookRequestDTO;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/webhook/document/result",
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * @returns any
   * @throws ApiError
   */
  public static postCaseNotification({
    requestBody,
  }: {
    requestBody: CaseNotificationWebhookRequestDTO;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/webhook/case/notification",
      body: requestBody,
      mediaType: "application/json",
    });
  }
}
