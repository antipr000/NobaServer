/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckTransactionDTO } from "../models/CheckTransactionDTO";
import type { CreateTransactionDTO } from "../models/CreateTransactionDTO";
import type { TransactionDTO } from "../models/TransactionDTO";
import type { TransactionQuoteDTO } from "../models/TransactionQuoteDTO";
import type { TransactionsQueryResultsDTO } from "../models/TransactionsQueryResultsDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class TransactionsService {
  /**
   * Get transaction quote (exchange rate, provider fees, network fees etc.)
   * @returns TransactionQuoteDTO
   * @throws ApiError
   */
  public static getTransactionQuote({
    xNobaApiKey,
    fiatCurrencyCode,
    cryptoCurrencyCode,
    fixedSide,
    fixedAmount,
    xNobaSignature,
    xNobaTimestamp,
    partnerId,
  }: {
    xNobaApiKey: string;
    fiatCurrencyCode: string;
    cryptoCurrencyCode: string;
    fixedSide: "fiat" | "crypto";
    fixedAmount: number;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
    partnerId?: string;
  }): CancelablePromise<TransactionQuoteDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/quote",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        fiatCurrencyCode: fiatCurrencyCode,
        cryptoCurrencyCode: cryptoCurrencyCode,
        fixedSide: fixedSide,
        fixedAmount: fixedAmount,
        partnerID: partnerId,
      },
      errors: {
        400: `Invalid currency code (fiat or crypto)`,
        503: `Unable to connect to underlying service provider`,
      },
    });
  }

  /**
   * Checks if the transaction parameters are valid
   * @returns CheckTransactionDTO
   * @throws ApiError
   */
  public static checkIfTransactionPossible({
    xNobaApiKey,
    type,
    transactionAmount,
    baseCurrency,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    type: "onramp" | "offramp" | "swap";
    transactionAmount: number;
    baseCurrency: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<CheckTransactionDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/check",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        type: type,
        transactionAmount: transactionAmount,
        baseCurrency: baseCurrency,
      },
    });
  }

  /**
   * Gets details of a transaction
   * @returns TransactionDTO Details of a transaction
   * @throws ApiError
   */
  public static getTransaction({
    xNobaApiKey,
    transactionId,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    transactionId: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<TransactionDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/{transactionID}",
      path: {
        transactionID: transactionId,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        404: `Transaction does not exist`,
      },
    });
  }

  /**
   * Submits a new transaction
   * @returns any Transaction ID
   * @throws ApiError
   */
  public static transact({
    xNobaApiKey,
    sessionKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    sessionKey: string;
    requestBody: CreateTransactionDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/transactions",
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
   * Gets all transactions for the logged-in consumer
   * @returns TransactionsQueryResultsDTO List of all transactions
   * @throws ApiError
   */
  public static getTransactions({
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
      | "COMPLETED"
      | "FAILED";
  }): CancelablePromise<TransactionsQueryResultsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions",
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
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Downloads all the transactions of a particular consumer
   * @returns TransactionDTO A CSV or PDF file containing details of all the transactions made by the consumer
   * @throws ApiError
   */
  public static downloadTransactions({
    xNobaApiKey,
    reportFormat,
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
    /**
     * Format in which you want the transactions report. Current 'CSV' is supported.
     */
    reportFormat: "csv" | "pdf";
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
      | "COMPLETED"
      | "FAILED";
  }): CancelablePromise<Array<TransactionDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/download",
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
        reportFormat: reportFormat,
      },
    });
  }
}
