/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckTransactionDTO } from "../models/CheckTransactionDTO";
import type { CreateTransactionDTO } from "../models/CreateTransactionDTO";
import type { TransactionDTO } from "../models/TransactionDTO";
import type { TransactionQuoteDTO } from "../models/TransactionQuoteDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class TransactionsService {
  /**
   * Get transaction quote (exchange rate, provider fees, network fees etc.)
   * @param fiatCurrencyCode
   * @param cryptoCurrencyCode
   * @param fixedSide
   * @param fixedAmount
   * @returns TransactionQuoteDTO
   * @throws ApiError
   */
  public static getTransactionQuote(
    fiatCurrencyCode: string,
    cryptoCurrencyCode: string,
    fixedSide: "fiat" | "crypto",
    fixedAmount: number,
  ): CancelablePromise<TransactionQuoteDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/quote",
      query: {
        fiatCurrencyCode: fiatCurrencyCode,
        cryptoCurrencyCode: cryptoCurrencyCode,
        fixedSide: fixedSide,
        fixedAmount: fixedAmount,
      },
      errors: {
        400: `Invalid currency code (fiat or crypto)`,
        503: `Unable to connect to underlying service provider`,
      },
    });
  }

  /**
   * Checks if the transaction parameters are valid
   * @param type
   * @param transactionAmount
   * @param baseCurrency
   * @returns CheckTransactionDTO
   * @throws ApiError
   */
  public static checkIfTransactionPossible(
    type: "onramp" | "offramp" | "swap",
    transactionAmount: number,
    baseCurrency: string,
  ): CancelablePromise<CheckTransactionDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/check",
      query: {
        type: type,
        transactionAmount: transactionAmount,
        baseCurrency: baseCurrency,
      },
    });
  }

  /**
   * Gets details of a transaction
   * @param transactionId
   * @returns TransactionDTO Details of a transaction
   * @throws ApiError
   */
  public static getTransactionStatus(transactionId: string): CancelablePromise<TransactionDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/{transactionID}",
      path: {
        transactionID: transactionId,
      },
      errors: {
        404: `Transaction does not exist`,
      },
    });
  }

  /**
   * Submits a new transaction
   * @param sessionKey
   * @param requestBody
   * @returns TransactionDTO Transaction details
   * @throws ApiError
   */
  public static transact(sessionKey: string, requestBody: CreateTransactionDTO): CancelablePromise<TransactionDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/transactions",
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
   * @param startDate Format: YYYY-MM-DD, example: 2010-04-27
   * @param endDate Format: YYYY-MM-DD, example: 2010-04-27
   * @returns TransactionDTO List of all transactions
   * @throws ApiError
   */
  public static getTransactions(startDate?: string, endDate?: string): CancelablePromise<Array<TransactionDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions",
      query: {
        startDate: startDate,
        endDate: endDate,
      },
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Downloads all the transactions of a particular consumer
   * @param reportFormat Format in which you want the transactions report. Current 'CSV' is supported.
   * @param startDate Format: YYYY-MM-DD, example: 2010-04-27
   * @param endDate Format: YYYY-MM-DD, example: 2010-04-27
   * @returns TransactionDTO A CSV or PDF file containing details of all the transactions made by the consumer
   * @throws ApiError
   */
  public static downloadTransactions(
    reportFormat: "csv" | "pdf",
    startDate?: string,
    endDate?: string,
  ): CancelablePromise<Array<TransactionDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/download",
      query: {
        startDate: startDate,
        endDate: endDate,
        reportFormat: reportFormat,
      },
    });
  }
}
