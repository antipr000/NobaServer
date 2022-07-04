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
   * Send the OTP filled in by the user to Noba Server and get the access token
   * @param requestBody
   * @returns VerifyOtpResponseDTO Noba access token of the user
   * @throws ApiError
   */
  public static verifyOtp(requestBody: VerifyOtpRequestDTO): CancelablePromise<VerifyOtpResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/auth/verifyotp",
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Sends otp to the email/phone provided
   * @param requestBody
   * @returns any Email successfully sent
   * @throws ApiError
   */
  public static loginUser(requestBody: LoginRequestDTO): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/auth/login",
      body: requestBody,
      mediaType: "application/json",
    });
  }
}
