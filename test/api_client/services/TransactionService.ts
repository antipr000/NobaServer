/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckTransactionDTO } from "../models/CheckTransactionDTO";
import type { InitiateTransactionDTO } from "../models/InitiateTransactionDTO";
import type { QuoteResponseDTO } from "../models/QuoteResponseDTO";
import type { TransactionDTO } from "../models/TransactionDTO";
import type { TransactionQueryResultDTO } from "../models/TransactionQueryResultDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class TransactionService {
  /**
   * Get all transactions for logged in user
   * @returns TransactionQueryResultDTO
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
    creditCurrency,
    debitCurrency,
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
        creditCurrency: creditCurrency,
        debitCurrency: debitCurrency,
        transactionStatus: transactionStatus,
      },
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Submits a new transaction
   * @returns TransactionDTO Transaction ID
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
  }): CancelablePromise<TransactionDTO> {
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
   * Gets a quote in specified currency
   * @returns QuoteResponseDTO
   * @throws ApiError
   */
  public static getQuote({
    xNobaApiKey,
    amount,
    currency,
    desiredCurrency,
    workflowName,
    xNobaSignature,
    xNobaTimestamp,
    options,
  }: {
    xNobaApiKey: string;
    amount: number;
    currency: "USD" | "COP";
    desiredCurrency: "USD" | "COP";
    workflowName:
      | "WALLET_WITHDRAWAL"
      | "WALLET_DEPOSIT"
      | "WALLET_TRANSFER"
      | "PAYROLL_DEPOSIT"
      | "PAYROLL_PROCESSING"
      | "CARD_WITHDRAWAL"
      | "CARD_REVERSAL"
      | "BULK_ADD_EMPLOYEES";
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
    options?: Array<"IS_COLLECTION">;
  }): CancelablePromise<QuoteResponseDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v2/transactions/quote",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        amount: amount,
        currency: currency,
        desiredCurrency: desiredCurrency,
        workflowName: workflowName,
        options: options,
      },
      errors: {
        404: `Quote for given currency not found`,
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
    type: "NOBA_WALLET";
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
      url: "/v2/transactions/check",
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
   * @returns TransactionDTO
   * @throws ApiError
   */
  public static getTransaction({
    xNobaApiKey,
    transactionRef,
    xNobaSignature,
    xNobaTimestamp,
    includeEvents,
  }: {
    xNobaApiKey: string;
    transactionRef: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
    includeEvents?: "All" | "External Only" | "None";
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
      query: {
        includeEvents: includeEvents,
      },
      errors: {
        404: `Requested transaction is not found`,
      },
    });
  }
}
