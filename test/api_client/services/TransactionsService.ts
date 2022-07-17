/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CheckTransactionDTO } from "../models/CheckTransactionDTO";
import type { CreateTransactionDTO } from "../models/CreateTransactionDTO";
import type { TransactionDTO } from "../models/TransactionDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class TransactionsService {
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
      url: "/v1/transactions/",
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
  public static getTransactions(startDate: string, endDate: string): CancelablePromise<Array<TransactionDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/",
      query: {
        startDate: startDate,
        endDate: endDate,
      },
    });
  }

  /**
   * Downloads all the transactions of a particular consumer
   * @param startDate Format: YYYY-MM-DD, example: 2010-04-27
   * @param endDate Format: YYYY-MM-DD, example: 2010-04-27
   * @param reportFormat Format in which you want the transactions report. Current 'CSV' is supported.
   * @returns TransactionDTO A CSV or PDF file containing details of all the transactions made by the consumer
   * @throws ApiError
   */
  public static downloadTransactions(
    startDate: string,
    endDate: string,
    reportFormat: "csv" | "pdf",
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
