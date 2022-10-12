/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddPartnerAdminRequestDTO } from "../models/AddPartnerAdminRequestDTO";
import type { PartnerAdminDTO } from "../models/PartnerAdminDTO";
import type { PartnerDTO } from "../models/PartnerDTO";
import type { TransactionDTO } from "../models/TransactionDTO";
import type { TransactionsQueryResultsDTO } from "../models/TransactionsQueryResultsDTO";
import type { UpdatePartnerAdminRequestDTO } from "../models/UpdatePartnerAdminRequestDTO";
import type { UpdatePartnerRequestDTO } from "../models/UpdatePartnerRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class PartnerService {
  /**
   * Gets details of a partner
   * @returns PartnerDTO Details of partner
   * @throws ApiError
   */
  public static getPartner({
    xNobaApiKey,
    partnerId,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    partnerId: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<PartnerDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/partners/{partnerID}",
      path: {
        partnerID: partnerId,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to retrieve partner details`,
      },
    });
  }

  /**
   * Updates details of a partner
   * @returns PartnerDTO Partner details
   * @throws ApiError
   */
  public static updatePartner({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: UpdatePartnerRequestDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<PartnerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/partners",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to update partner details`,
      },
    });
  }

  /**
   * Gets details of a partner admin
   * @returns PartnerAdminDTO Details of partner admin
   * @throws ApiError
   */
  public static getPartnerAdmin({
    xNobaApiKey,
    partnerAdminId,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    partnerAdminId: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/partners/admins/{partnerAdminID}",
      path: {
        partnerAdminID: partnerAdminId,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to retrieve partner admin`,
      },
    });
  }

  /**
   * Updates details of a partner admin
   * @returns PartnerAdminDTO Details of updated partner admin
   * @throws ApiError
   */
  public static updatePartnerAdmin({
    xNobaApiKey,
    partnerAdminId,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    partnerAdminId: string;
    requestBody: UpdatePartnerAdminRequestDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/partners/admins/{partnerAdminID}",
      path: {
        partnerAdminID: partnerAdminId,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to update partner admin`,
      },
    });
  }

  /**
   * Deletes a parter admin
   * @returns PartnerAdminDTO Deleted partner admin record
   * @throws ApiError
   */
  public static deletePartnerAdmin({
    xNobaApiKey,
    partnerAdminId,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    partnerAdminId: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/partners/admins/{partnerAdminID}",
      path: {
        partnerAdminID: partnerAdminId,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to delete partner admin`,
      },
    });
  }

  /**
   * Gets all admins for the partner
   * @returns PartnerAdminDTO All admins of the partner
   * @throws ApiError
   */
  public static getAllPartnerAdmins({
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
  }): CancelablePromise<Array<PartnerAdminDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/partners/admins",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to retrieve partner admin list`,
      },
    });
  }

  /**
   * Adds a new partner admin
   * @returns PartnerAdminDTO New partner admin record
   * @throws ApiError
   */
  public static addPartnerAdmin({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: AddPartnerAdminRequestDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/partners/admins",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to add a new partner admin`,
      },
    });
  }

  /**
   * Get all transactions for the given partner
   * @returns TransactionsQueryResultsDTO All transactions for the partner
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
      url: "/v1/partners/admins/transactions",
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
      url: "/v1/partners/admins/transactions/{transactionID}",
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
}
