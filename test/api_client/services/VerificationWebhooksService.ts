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
    xSardineSignature,
    requestBody,
  }: {
    xSardineSignature: string;
    requestBody: DocumentVerificationWebhookRequestDTO;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/webhook/document/result",
      headers: {
        "x-sardine-signature": xSardineSignature,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * @returns any
   * @throws ApiError
   */
  public static postCaseNotification({
    xSardineSignature,
    requestBody,
  }: {
    xSardineSignature: string;
    requestBody: CaseNotificationWebhookRequestDTO;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/webhook/case/notification",
      headers: {
        "x-sardine-signature": xSardineSignature,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }
}
