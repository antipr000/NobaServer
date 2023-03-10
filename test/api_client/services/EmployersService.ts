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
  public static getEmployerByReferralId({ referralId }: { referralId: string }): CancelablePromise<EmployerDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/employers/{referralID}",
      path: {
        referralID: referralId,
      },
      errors: {
        404: `Employer not found`,
      },
    });
  }
}
