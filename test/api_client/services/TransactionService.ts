/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExchangeRateDTO } from "../models/ExchangeRateDTO";
import type { InitiateTransactionDTO } from "../models/InitiateTransactionDTO";
import type { TransactionDTO } from "../models/TransactionDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class TransactionService {
  /**
   * Gets details of a transaction
   * @returns TransactionDTO
   * @throws ApiError
   */
  public static getTransaction({
    xNobaApiKey,
    transactionRef,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    transactionRef: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<TransactionDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v2/transactions/{transactionRef}",
      path: {
        transactionRef: transactionRef,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        404: `Requested transaction is not found`,
      },
    });
  }

  /**
   * Get all transactions for logged in user
   * @returns any[]
   * @throws ApiError
   */
  public static getAllTransactions({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    consumerId,
    startDate,
    endDate,
    pageOffset,
    pageLimit,
    sortField,
    sortOrder,
    fiatCurrency,
    cryptoCurrency,
    transactionStatus,
  }: {
    xNobaApiKey: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
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
     * number of pages to skip, offset 0 means first page results, 1 means second page etc.
     */
    pageOffset?: number;
    /**
     * number of items per page
     */
    pageLimit?: number;
    /**
     * sort by field
     */
    sortField?: "transactionTimestamp" | "leg1Amount" | "leg2Amount" | "leg1" | "leg2";
    /**
     * sort order asc or desc
     */
    sortOrder?: "ASC" | "DESC";
    /**
     * filter for a particular fiat currency
     */
    fiatCurrency?: string;
    /**
     * filter for a particular Cryptocurrency
     */
    cryptoCurrency?: string;
    /**
     * filter for a particular transaction status
     */
    transactionStatus?:
      | "PENDING"
      | "VALIDATION_FAILED"
      | "VALIDATION_PASSED"
      | "FIAT_INCOMING_INITIATED"
      | "FIAT_INCOMING_COMPLETED"
      | "FIAT_INCOMING_FAILED"
      | "FIAT_REVERSAL_INITIATING"
      | "FIAT_INCOMING_REVERSAL_INITIATED"
      | "FIAT_INCOMING_REVERSAL_FAILED"
      | "FIAT_INCOMING_REVERSED"
      | "CRYPTO_OUTGOING_INITIATING"
      | "CRYPTO_OUTGOING_INITIATED"
      | "CRYPTO_OUTGOING_COMPLETED"
      | "CRYPTO_OUTGOING_FAILED"
      | "INTERNAL_TRANSFER_PENDING"
      | "COMPLETED"
      | "FAILED";
  }): CancelablePromise<any[]> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v2/transactions",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        consumerID: consumerId,
        startDate: startDate,
        endDate: endDate,
        pageOffset: pageOffset,
        pageLimit: pageLimit,
        sortField: sortField,
        sortOrder: sortOrder,
        fiatCurrency: fiatCurrency,
        cryptoCurrency: cryptoCurrency,
        transactionStatus: transactionStatus,
      },
    });
  }

  /**
   * Submits a new transaction
   * @returns any Transaction ID
   * @throws ApiError
   */
  public static initiateTransaction({
    xNobaApiKey,
    sessionKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    sessionKey: string;
    requestBody: InitiateTransactionDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v2/transactions",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        sessionKey: sessionKey,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Get exchange rate of conversion
   * @returns ExchangeRateDTO
   * @throws ApiError
   */
  public static getExchangeRate({
    xNobaApiKey,
    numeratorCurrency,
    denominatorCurrency,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    numeratorCurrency: string;
    denominatorCurrency: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ExchangeRateDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v2/transactions/rate",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        numeratorCurrency: numeratorCurrency,
        denominatorCurrency: denominatorCurrency,
      },
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }
}
