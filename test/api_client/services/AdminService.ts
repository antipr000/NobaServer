/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddNobaAdminDTO } from "../models/AddNobaAdminDTO";
import type { AdminLoginRequestDTO } from "../models/AdminLoginRequestDTO";
import type { AdminUpdateConsumerRequestDTO } from "../models/AdminUpdateConsumerRequestDTO";
import type { BlankResponseDTO } from "../models/BlankResponseDTO";
import type { ConsumerDTO } from "../models/ConsumerDTO";
import type { DeleteNobaAdminDTO } from "../models/DeleteNobaAdminDTO";
import type { ExchangeRateDTO } from "../models/ExchangeRateDTO";
import type { LoginResponseDTO } from "../models/LoginResponseDTO";
import type { NewAccessTokenRequestDTO } from "../models/NewAccessTokenRequestDTO";
import type { NobaAdminDTO } from "../models/NobaAdminDTO";
import type { TransactionStatsDTO } from "../models/TransactionStatsDTO";
import type { UpdateNobaAdminDTO } from "../models/UpdateNobaAdminDTO";
import type { VerifyOtpRequestDTO } from "../models/VerifyOtpRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class AdminService {
  /**
   * Logs admin in and sends one-time passcode (OTP) to the provided email address
   * @returns BlankResponseDTO OTP successfully sent.
   * @throws ApiError
   */
  public static loginAdmin({
    requestBody,
  }: {
    requestBody: AdminLoginRequestDTO;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins/auth/login",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        403: `Access denied`,
      },
    });
  }

  /**
   * Submits the one-time passcode (OTP) to retreive an API access token
   * @returns LoginResponseDTO API access token
   * @throws ApiError
   */
  public static verifyAdminOtp({
    requestBody,
  }: {
    requestBody: VerifyOtpRequestDTO;
  }): CancelablePromise<LoginResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins/auth/verifyotp",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        401: `Invalid OTP`,
      },
    });
  }

  /**
   * returns a new JWT based access token with a refresh token for admins
   * @returns LoginResponseDTO API new access token and refresh token
   * @throws ApiError
   */
  public static newAccessTokenForAdmin({
    requestBody,
  }: {
    requestBody: NewAccessTokenRequestDTO;
  }): CancelablePromise<LoginResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins/auth/accesstoken",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        401: `Invalid Refresh Token, either already used or expired`,
      },
    });
  }

  /**
   * Gets all transaction metrics
   * @returns TransactionStatsDTO Transaction statistics
   * @throws ApiError
   */
  public static getTransactionMetrics({
    xNobaApiKey,
    adminId,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    adminId: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<TransactionStatsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/{adminID}/transactionmetrics",
      path: {
        adminID: adminId,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
    });
  }

  /**
   * Creates a new Noba admin with the specified role
   * @returns NobaAdminDTO The newly created Noba admin
   * @throws ApiError
   */
  public static createNobaAdmin({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: AddNobaAdminDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<NobaAdminDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        403: `User forbidden from adding new Noba admin`,
        409: `User is already a Noba admin`,
      },
    });
  }

  /**
   * Gets the details of the logged in Noba admin
   * @returns NobaAdminDTO The logged in Noba admin
   * @throws ApiError
   */
  public static getNobaAdmin({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<NobaAdminDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        403: `User forbidden from retrieving details of the Noba admin`,
      },
    });
  }

  /**
   * Updates the details of a Noba admin
   * @returns NobaAdminDTO The updated NobaAdmin.
   * @throws ApiError
   */
  public static updateNobaAdmin({
    xNobaApiKey,
    adminId,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    adminId: string;
    requestBody: UpdateNobaAdminDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<NobaAdminDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/admins/{adminID}",
      path: {
        adminID: adminId,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        403: `User forbidden from updating Noba admin or attempt to update one's own record`,
        404: `Noba admin not found`,
      },
    });
  }

  /**
   * Deletes a Noba admin
   * @returns DeleteNobaAdminDTO The ID of the Noba admin to delete
   * @throws ApiError
   */
  public static deleteNobaAdmin({
    xNobaApiKey,
    adminId,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    adminId: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<DeleteNobaAdminDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/admins/{adminID}",
      path: {
        adminID: adminId,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        403: `User forbidden from deleting Noba admin or attempt to delete one's own record`,
        404: `Noba admin not found`,
      },
    });
  }

  /**
   * Updates a consumer
   * @returns ConsumerDTO Updated consumer record
   * @throws ApiError
   */
  public static updateConsumer({
    xNobaApiKey,
    consumerId,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    consumerId: string;
    requestBody: AdminUpdateConsumerRequestDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/admins/consumers/{consumerID}",
      path: {
        consumerID: consumerId,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid parameter(s)`,
        403: `User forbidden from updating consumer record`,
      },
    });
  }

  /**
   * Creates a new exchange rate entry
   * @returns ExchangeRateDTO The newly created exchange rate(s). Index [0] is the forward rate that was created, index [1] is the inverse rate if addInverse is true
   * @throws ApiError
   */
  public static createExchangeRate({
    xNobaApiKey,
    addInverse,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    /**
     * Whether to also add the inverse of this rate
     */
    addInverse: boolean;
    requestBody: ExchangeRateDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<Array<ExchangeRateDTO>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins/exchangerates",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        addInverse: addInverse,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        403: `User forbidden from adding new exchange rate`,
      },
    });
  }
}
