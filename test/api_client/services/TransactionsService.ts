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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param fiatCurrencyCode
   * @param cryptoCurrencyCode
   * @param fixedSide
   * @param fixedAmount
   * @param partnerId
   * @returns TransactionQuoteDTO
   * @throws ApiError
   */
  public static getTransactionQuote(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    fiatCurrencyCode: string,
    cryptoCurrencyCode: string,
    fixedSide: "fiat" | "crypto",
    fixedAmount: number,
    partnerId?: string,
  ): CancelablePromise<TransactionQuoteDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/quote",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param type
   * @param transactionAmount
   * @param baseCurrency
   * @returns CheckTransactionDTO
   * @throws ApiError
   */
  public static checkIfTransactionPossible(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    type: "onramp" | "offramp" | "swap",
    transactionAmount: number,
    baseCurrency: string,
  ): CancelablePromise<CheckTransactionDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/check",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param transactionId
   * @returns TransactionDTO Details of a transaction
   * @throws ApiError
   */
  public static getTransactionStatus(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    transactionId: string,
  ): CancelablePromise<TransactionDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/{transactionID}",
      path: {
        transactionID: transactionId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        404: `Transaction does not exist`,
      },
    });
  }

  /**
   * Submits a new transaction
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param sessionKey
   * @param requestBody
   * @returns any Transaction ID
   * @throws ApiError
   */
  public static transact(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    sessionKey: string,
    requestBody: CreateTransactionDTO,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/transactions",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param startDate Format: YYYY-MM-DD, example: 2010-04-27
   * @param endDate Format: YYYY-MM-DD, example: 2010-04-27
   * @returns TransactionDTO List of all transactions
   * @throws ApiError
   */
  public static getTransactions(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    startDate?: string,
    endDate?: string,
  ): CancelablePromise<Array<TransactionDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param reportFormat Format in which you want the transactions report. Current 'CSV' is supported.
   * @param startDate Format: YYYY-MM-DD, example: 2010-04-27
   * @param endDate Format: YYYY-MM-DD, example: 2010-04-27
   * @returns TransactionDTO A CSV or PDF file containing details of all the transactions made by the consumer
   * @throws ApiError
   */
  public static downloadTransactions(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    reportFormat: "csv" | "pdf",
    startDate?: string,
    endDate?: string,
  ): CancelablePromise<Array<TransactionDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/download",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      query: {
        startDate: startDate,
        endDate: endDate,
        reportFormat: reportFormat,
      },
    });
  }
}
