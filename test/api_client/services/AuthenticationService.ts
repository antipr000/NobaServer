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
   * @returns VerifyOtpResponseDTO API access token
   * @throws ApiError
   */
  public static verifyOtp({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: VerifyOtpRequestDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<VerifyOtpResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/auth/verifyotp",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
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
   * @returns any OTP successfully sent.
   * @throws ApiError
   */
  public static loginUser({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: LoginRequestDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/auth/login",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        403: `Access denied`,
      },
    });
  }
}
