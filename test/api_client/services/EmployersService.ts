/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EmployerDTO } from "../models/EmployerDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class EmployersService {
  /**
   * Retrieve employer details by referral ID
   * @returns EmployerDTO Employer summary
   * @throws ApiError
   */
  public static getEmployerByReferralId({
    xNobaApiKey,
    referralId,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    referralId: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<EmployerDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/employers/{referralID}",
      path: {
        referralID: referralId,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        404: `Employer not found`,
      },
    });
  }
}
