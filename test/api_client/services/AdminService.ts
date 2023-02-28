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
  public static getTransactionMetrics({ adminId }: { adminId: string }): CancelablePromise<TransactionStatsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/{adminID}/transactionmetrics",
      path: {
        adminID: adminId,
      },
    });
  }

  /**
   * Creates a new Noba admin with the specified role
   * @returns NobaAdminDTO The newly created Noba admin
   * @throws ApiError
   */
  public static createNobaAdmin({ requestBody }: { requestBody: AddNobaAdminDTO }): CancelablePromise<NobaAdminDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins",
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
  public static getNobaAdmin(): CancelablePromise<NobaAdminDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins",
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
    adminId,
    requestBody,
  }: {
    adminId: string;
    requestBody: UpdateNobaAdminDTO;
  }): CancelablePromise<NobaAdminDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/admins/{adminID}",
      path: {
        adminID: adminId,
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
  public static deleteNobaAdmin({ adminId }: { adminId: string }): CancelablePromise<DeleteNobaAdminDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/admins/{adminID}",
      path: {
        adminID: adminId,
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
    consumerId,
    requestBody,
  }: {
    consumerId: string;
    requestBody: AdminUpdateConsumerRequestDTO;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/admins/consumers/{consumerID}",
      path: {
        consumerID: consumerId,
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
   * Gets the balances of accounts based on providers
   * @returns any Balances of accounts
   * @throws ApiError
   */
  public static getAccountBalances({
    accountBalanceType,
    accountIDs,
  }: {
    /**
     * filter for a particular account type for balance
     */
    accountBalanceType: "CIRCLE" | "MONO";
    /**
     * filter for a list of account IDs
     */
    accountIDs: Array<string>;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/balances",
      query: {
        accountBalanceType: accountBalanceType,
        accountIDs: accountIDs,
      },
      errors: {
        403: `User forbidden from getting account balances`,
      },
    });
  }

  /**
   * Creates a new exchange rate entry
   * @returns ExchangeRateDTO The newly created exchange rate(s). Index [0] is the forward rate that was created, index [1] is the inverse rate if addInverse is true
   * @throws ApiError
   */
  public static createExchangeRate({
    addInverse,
    requestBody,
  }: {
    /**
     * Whether to also add the inverse of this rate
     */
    addInverse: boolean;
    requestBody: ExchangeRateDTO;
  }): CancelablePromise<Array<ExchangeRateDTO>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins/exchangerates",
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
