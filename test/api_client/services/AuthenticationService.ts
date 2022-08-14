/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LoginRequestDTO } from "../models/LoginRequestDTO";
import type { VerifyOtpRequestDTO } from "../models/VerifyOtpRequestDTO";
import type { VerifyOtpResponseDTO } from "../models/VerifyOtpResponseDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class AuthenticationService {
  /**
   * Submits the one-time passcode (OTP) to retreive an API access token
   * @param xNobaApiKey
   * @param xNobaTimestamp
   * @param xNobaSignature
   * @param requestBody
   * @returns VerifyOtpResponseDTO API access token
   * @throws ApiError
   */
  public static verifyOtp(
    xNobaApiKey: string,
    xNobaTimestamp: string,
    xNobaSignature: string,
    requestBody: VerifyOtpRequestDTO,
  ): CancelablePromise<VerifyOtpResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/auth/verifyotp",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Timestamp": xNobaTimestamp,
        "X-Noba-Signature": xNobaSignature,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        401: `Invalid OTP`,
      },
    });
  }

  /**
   * Logs user in and sends one-time passcode (OTP) to the provided email address
   * @param xNobaApiKey
   * @param xNobaTimestamp
   * @param xNobaSignature
   * @param requestBody
   * @returns any Email successfully sent
   * @throws ApiError
   */
  public static loginUser(
    xNobaApiKey: string,
    xNobaTimestamp: string,
    xNobaSignature: string,
    requestBody: LoginRequestDTO,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/auth/login",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Timestamp": xNobaTimestamp,
        "X-Noba-Signature": xNobaSignature,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        403: `Account does not exist`,
      },
    });
  }
}
