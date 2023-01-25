/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RegisterEmployerRequestDTO } from "../models/RegisterEmployerRequestDTO";
import type { UpdateEmployerRequestDTO } from "../models/UpdateEmployerRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class WebhooksService {
  /**
   * Register the Employer in Noba
   * @returns any
   * @throws ApiError
   */
  public static registerEmployer({ requestBody }: { requestBody: RegisterEmployerRequestDTO }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/webhooks/bubble/employers",
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Update the Employer in Noba
   * @returns any
   * @throws ApiError
   */
  public static updateEmployer({
    referralId,
    requestBody,
  }: {
    referralId: string;
    requestBody: UpdateEmployerRequestDTO;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/webhooks/bubble/employers/{referralID}",
      path: {
        referralID: referralId,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }
}
