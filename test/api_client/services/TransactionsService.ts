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
   * Checks if a transaction with given input is possible for a user or not i.e. if they have reached some limit or if id verification is required.
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
   * Get transaction details for a given transactionID
   * @param transactionId
   * @returns TransactionDTO Transaction details for the given transactionId
   * @throws ApiError
   */
  public static getTransactionStatus(transactionId: string): CancelablePromise<TransactionDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions/{transactionID}",
      path: {
        transactionID: transactionId,
      },
    });
  }

  /**
   * Place a transaction with Noba
   * @param requestBody
   * @returns TransactionDTO Returns transaction id if transaction is placed successfully
   * @throws ApiError
   */
  public static transact(requestBody: CreateTransactionDTO): CancelablePromise<TransactionDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/transactions/trasact",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Bad request. Invalid input.`,
        502: `Bad gateway. Something went wrong.`,
      },
    });
  }

  /**
   * Get all transactions for a particular user
   * @param startDate Format: YYYY-MM-DD, example: 2010-04-27
   * @param endDate Format: YYYY-MM-DD, example: 2010-04-27
   * @returns TransactionDTO List of all transactions that happened through Noba for given userID
   * @throws ApiError
   */
  public static getTransactions(startDate: string, endDate: string): CancelablePromise<Array<TransactionDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/transactions",
      query: {
        startDate: startDate,
        endDate: endDate,
      },
    });
  }

  /**
   * Download all the transactions of a particular user.
   * @param startDate Format: YYYY-MM-DD, example: 2010-04-27
   * @param endDate Format: YYYY-MM-DD, example: 2010-04-27
   * @param reportFormat Format in which you want the transactions report. Current 'CSV' is supported.
   * @returns TransactionDTO A CSV or PDF file containing details of all the transactions made by the user.
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
