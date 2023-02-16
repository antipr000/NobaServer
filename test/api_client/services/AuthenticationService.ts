/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BlankResponseDTO } from "../models/BlankResponseDTO";
import type { LoginRequestDTO } from "../models/LoginRequestDTO";
import type { LoginResponseDTO } from "../models/LoginResponseDTO";
import type { NewAccessTokenRequestDTO } from "../models/NewAccessTokenRequestDTO";
import type { VerifyOtpRequestDTO } from "../models/VerifyOtpRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class AuthenticationService {
  /**
   * returns a new JWT based access token with a refresh token
   * @returns LoginResponseDTO API new access token and refresh token
   * @throws ApiError
   */
  public static newAccessToken({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: NewAccessTokenRequestDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<LoginResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/auth/accesstoken",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        401: `Invalid Refresh Token, either already used or expired`,
      },
    });
  }

  /**
   * Submits the one-time passcode (OTP) to retreive an API access token
   * @returns LoginResponseDTO API access token
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
  }): CancelablePromise<LoginResponseDTO> {
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
   * @returns BlankResponseDTO OTP successfully sent.
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
  }): CancelablePromise<BlankResponseDTO> {
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
