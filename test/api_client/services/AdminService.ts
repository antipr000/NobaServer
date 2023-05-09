/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddNobaAdminDTO } from "../models/AddNobaAdminDTO";
import type { AdminLoginRequestDTO } from "../models/AdminLoginRequestDTO";
import type { AdminUpdateConsumerRequestDTO } from "../models/AdminUpdateConsumerRequestDTO";
import type { AdminVerifyOtpRequestDTO } from "../models/AdminVerifyOtpRequestDTO";
import type { BlankResponseDTO } from "../models/BlankResponseDTO";
import type { ConsumerInternalDTO } from "../models/ConsumerInternalDTO";
import type { DeleteNobaAdminDTO } from "../models/DeleteNobaAdminDTO";
import type { ExchangeRateDTO } from "../models/ExchangeRateDTO";
import type { LoginResponseDTO } from "../models/LoginResponseDTO";
import type { NobaAdminDTO } from "../models/NobaAdminDTO";
import type { TransactionDTO } from "../models/TransactionDTO";
import type { TransactionQueryResultDTO } from "../models/TransactionQueryResultDTO";
import type { TransactionStatsDTO } from "../models/TransactionStatsDTO";
import type { UpdateNobaAdminDTO } from "../models/UpdateNobaAdminDTO";
import type { UpdatePayrollRequestDTO } from "../models/UpdatePayrollRequestDTO";

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
    requestBody: AdminVerifyOtpRequestDTO;
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
   * Gets the details of all Noba admins
   * @returns NobaAdminDTO All Noba admins
   * @throws ApiError
   */
  public static getAllNobaAdmins(): CancelablePromise<Array<NobaAdminDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins",
      errors: {
        403: `User forbidden from retrieving details of all Noba admin`,
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
      url: "/v1/admins/current",
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
   * @returns ConsumerInternalDTO Updated consumer record
   * @throws ApiError
   */
  public static updateConsumer({
    consumerId,
    requestBody,
  }: {
    consumerId: string;
    requestBody: AdminUpdateConsumerRequestDTO;
  }): CancelablePromise<ConsumerInternalDTO> {
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
   * Updates the payroll status
   * @returns any Payroll status is updated successfully
   * @throws ApiError
   */
  public static updatePayrollStatus({
    payrollId,
    requestBody,
  }: {
    payrollId: string;
    requestBody: UpdatePayrollRequestDTO;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/admins/payrolls/{payrollID}",
      path: {
        payrollID: payrollId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        403: `User forbidden from updating the Payroll status`,
      },
    });
  }

  /**
   * Retries an existing payroll
   * @returns any Payroll is retried successfully
   * @throws ApiError
   */
  public static retryPayroll({ payrollId }: { payrollId: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins/payrolls/{payrollID}/retry",
      path: {
        payrollID: payrollId,
      },
      errors: {
        403: `User forbidden from updating the Payroll status`,
      },
    });
  }

  /**
   * Gets all consumers or a subset based on query parameters
   * @returns ConsumerInternalDTO List of consumers
   * @throws ApiError
   */
  public static getConsumers({
    consumerId,
    phone,
    email,
    name,
    handle,
    kycStatus,
  }: {
    consumerId?: string;
    phone?: string;
    email?: string;
    name?: string;
    handle?: string;
    kycStatus?: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "FLAGGED" | "REJECTED";
  }): CancelablePromise<Array<ConsumerInternalDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/consumers",
      query: {
        consumerID: consumerId,
        phone: phone,
        email: email,
        name: name,
        handle: handle,
        kycStatus: kycStatus,
      },
      errors: {
        403: `User forbidden from getting consumers`,
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

  /**
   * Get exchange rate between a currency pair
   * @returns ExchangeRateDTO
   * @throws ApiError
   */
  public static getExchangeRate({
    numeratorCurrency,
    denominatorCurrency,
  }: {
    numeratorCurrency: string;
    denominatorCurrency: string;
  }): CancelablePromise<ExchangeRateDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/exchangerates",
      query: {
        numeratorCurrency: numeratorCurrency,
        denominatorCurrency: denominatorCurrency,
      },
      errors: {
        400: `Invalid request parameters`,
        404: `Exchange rate not found`,
      },
    });
  }

  /**
   * Gets all transactions for supplied filters
   * @returns TransactionQueryResultDTO
   * @throws ApiError
   */
  public static getAllTransactions({
    consumerId,
    startDate,
    endDate,
    pageOffset,
    pageLimit,
    creditCurrency,
    debitCurrency,
    transactionStatus,
  }: {
    /**
     * Consumer ID whose transactions is needed
     */
    consumerId?: string;
    /**
     * Format: YYYY-MM-DD, example: 2010-04-27
     */
    startDate?: string;
    /**
     * Format: YYYY-MM-DD, example: 2010-04-27
     */
    endDate?: string;
    /**
     * Page number, offset 1 means first page results, 2 means second page etc.
     */
    pageOffset?: number;
    /**
     * number of items per page
     */
    pageLimit?: number;
    /**
     * filter for a particular credit currency
     */
    creditCurrency?: string;
    /**
     * filter for a particular debit currency
     */
    debitCurrency?: string;
    /**
     * filter for a particular transaction status
     */
    transactionStatus?: "INITIATED" | "COMPLETED" | "FAILED" | "PROCESSING" | "EXPIRED";
  }): CancelablePromise<TransactionQueryResultDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/transactions",
      query: {
        consumerID: consumerId,
        startDate: startDate,
        endDate: endDate,
        pageOffset: pageOffset,
        pageLimit: pageLimit,
        creditCurrency: creditCurrency,
        debitCurrency: debitCurrency,
        transactionStatus: transactionStatus,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `User forbidden from getting all transactions`,
      },
    });
  }

  /**
   * Gets details of any transaction
   * @returns TransactionDTO
   * @throws ApiError
   */
  public static getTransaction({
    transactionRef,
    includeEvents,
  }: {
    transactionRef: string;
    includeEvents?: "All" | "External Only" | "None";
  }): CancelablePromise<TransactionDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/transactions/{transactionRef}",
      path: {
        transactionRef: transactionRef,
      },
      query: {
        includeEvents: includeEvents,
      },
      errors: {
        404: `Requested transaction is not found`,
      },
    });
  }
}
