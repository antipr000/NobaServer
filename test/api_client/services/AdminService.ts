/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddPartnerAdminRequestDTO } from "../models/AddPartnerAdminRequestDTO";
import type { AddPartnerRequestDTO } from "../models/AddPartnerRequestDTO";
import type { AdminUpdateConsumerRequestDTO } from "../models/AdminUpdateConsumerRequestDTO";
import type { ConsumerDTO } from "../models/ConsumerDTO";
import type { DeleteNobaAdminDTO } from "../models/DeleteNobaAdminDTO";
import type { NobaAdminDTO } from "../models/NobaAdminDTO";
import type { PartnerAdminDTO } from "../models/PartnerAdminDTO";
import type { PartnerDTO } from "../models/PartnerDTO";
import type { TransactionDTO } from "../models/TransactionDTO";
import type { TransactionStatsDTO } from "../models/TransactionStatsDTO";
import type { UpdateNobaAdminDTO } from "../models/UpdateNobaAdminDTO";
import type { UpdatePartnerAdminRequestDTO } from "../models/UpdatePartnerAdminRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class AdminService {
  /**
   * Gets all transaction metrics for a given partner
   * @returns TransactionStatsDTO Transaction statistics
   * @throws ApiError
   */
  public static getTransactionMetrics({
    xNobaApiKey,
    adminId,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    adminId: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<TransactionStatsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/{adminID}/transactionmetrics",
      path: {
        adminID: adminId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
    });
  }

  /**
   * Gets all transactions filtered by the specified date range
   * @returns TransactionDTO All transactions within the specified date range
   * @throws ApiError
   */
  public static getAllTransactions({
    xNobaApiKey,
    adminId,
    startDate,
    endDate,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    adminId: string;
    /**
     * Format: YYYY-MM-DD, example: 2010-04-27
     */
    startDate: string;
    /**
     * Format: YYYY-MM-DD, example: 2010-04-27
     */
    endDate: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<Array<TransactionDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/{adminID}/transactions",
      path: {
        adminID: adminId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      query: {
        startDate: startDate,
        endDate: endDate,
      },
    });
  }

  /**
   * Creates a new Noba admin with the specified role
   * @returns NobaAdminDTO The newly created Noba admin
   * @throws ApiError
   */
  public static createNobaAdmin({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: NobaAdminDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<NobaAdminDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
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
  public static getNobaAdmin({
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
  }): CancelablePromise<NobaAdminDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
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
    xNobaApiKey,
    adminId,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    adminId: string;
    requestBody: UpdateNobaAdminDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<NobaAdminDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/admins/{adminID}",
      path: {
        adminID: adminId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
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
  public static deleteNobaAdmin({
    xNobaApiKey,
    adminId,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    adminId: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<DeleteNobaAdminDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/admins/{adminID}",
      path: {
        adminID: adminId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        403: `User forbidden from deleting Noba admin or attempt to delete one's own record`,
        404: `Noba admin not found`,
      },
    });
  }

  /**
   * Adds a new partner admin
   * @returns PartnerAdminDTO Adds a new partner admin
   * @throws ApiError
   */
  public static addAdminsForPartners({
    xNobaApiKey,
    partnerId,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    partnerId: string;
    requestBody: AddPartnerAdminRequestDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins/partners/{partnerID}/admins",
      path: {
        partnerID: partnerId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid parameter(s)`,
        403: `User forbidden from adding a new partner admin`,
        404: `Partner admin not found`,
      },
    });
  }

  /**
   * Deletes a partner admin
   * @returns PartnerAdminDTO Add a new partner admin
   * @throws ApiError
   */
  public static deleteAdminsForPartners({
    xNobaApiKey,
    partnerId,
    partnerAdminId,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    partnerId: string;
    partnerAdminId: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/admins/partners/{partnerID}/admins/{partnerAdminID}",
      path: {
        partnerID: partnerId,
        partnerAdminID: partnerAdminId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid parameter(s)`,
        403: `User forbidden from deleting a partner admin`,
        404: `Partner admin not found`,
      },
    });
  }

  /**
   * Update details of a partner admin
   * @returns PartnerAdminDTO Update details of a partner admin
   * @throws ApiError
   */
  public static updateAdminForPartners({
    xNobaApiKey,
    partnerId,
    partnerAdminId,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    partnerId: string;
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
      url: "/v1/admins/partners/{partnerID}/admins/{partnerAdminID}",
      path: {
        partnerID: partnerId,
        partnerAdminID: partnerAdminId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid parameter(s)`,
        403: `User forbidden from updating a partner admin`,
        404: `Partner admin not found`,
      },
    });
  }

  /**
   * Adds a new partner
   * @returns PartnerDTO New partner record
   * @throws ApiError
   */
  public static registerPartner({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: AddPartnerRequestDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<PartnerDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins/partners",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid parameter(s)`,
        403: `User forbidden from adding a new partner`,
      },
    });
  }

  /**
   * Updates a consumer
   * @returns ConsumerDTO Updated consumer record
   * @throws ApiError
   */
  public static updateConsumer({
    xNobaApiKey,
    consumerId,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    consumerId: string;
    requestBody: AdminUpdateConsumerRequestDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/admins/consumers/{consumerID}",
      path: {
        consumerID: consumerId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid parameter(s)`,
        403: `User forbidden from updating consumer record`,
      },
    });
  }
}
