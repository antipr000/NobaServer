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
   * @param adminId
   * @returns TransactionStatsDTO Transaction statistics
   * @throws ApiError
   */
  public static getTransactionMetrics(adminId: string): CancelablePromise<TransactionStatsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/{adminID}/transactionmetrics",
      path: {
        adminID: adminId,
      },
    });
  }

  /**
   * Gets all transactions filtered by the specified date range
   * @param adminId
   * @param startDate Format: YYYY-MM-DD, example: 2010-04-27
   * @param endDate Format: YYYY-MM-DD, example: 2010-04-27
   * @returns TransactionDTO All transactions within the specified date range
   * @throws ApiError
   */
  public static getAllTransactions(
    adminId: string,
    startDate: string,
    endDate: string,
  ): CancelablePromise<Array<TransactionDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/{adminID}/transactions",
      path: {
        adminID: adminId,
      },
      query: {
        startDate: startDate,
        endDate: endDate,
      },
    });
  }

  /**
   * Creates a new Noba admin with the specified role
   * @param requestBody
   * @returns NobaAdminDTO The newly created Noba admin
   * @throws ApiError
   */
  public static createNobaAdmin(requestBody: NobaAdminDTO): CancelablePromise<NobaAdminDTO> {
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
   * Gets the details of the logged in Noba admin
   * @returns NobaAdminDTO The logged in Noba admin
   * @throws ApiError
   */
  public static getNobaAdmin(): CancelablePromise<NobaAdminDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins",
      errors: {
        403: `User forbidden from retrieving details of the Noba admin`,
      },
    });
  }

  /**
   * Updates the details of a Noba admin
   * @param adminId
   * @param requestBody
   * @returns NobaAdminDTO The updated NobaAdmin.
   * @throws ApiError
   */
  public static updateNobaAdmin(adminId: string, requestBody: UpdateNobaAdminDTO): CancelablePromise<NobaAdminDTO> {
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
   * @param adminId
   * @returns DeleteNobaAdminDTO The ID of the Noba admin to delete
   * @throws ApiError
   */
  public static deleteNobaAdmin(adminId: string): CancelablePromise<DeleteNobaAdminDTO> {
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
   * Adds a new partner admin
   * @param partnerId
   * @param requestBody
   * @returns PartnerAdminDTO Adds a new partner admin
   * @throws ApiError
   */
  public static addAdminsForPartners(
    partnerId: string,
    requestBody: AddPartnerAdminRequestDTO,
  ): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins/partners/{partnerID}/admins",
      path: {
        partnerID: partnerId,
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
   * @param partnerId
   * @param partnerAdminId
   * @returns PartnerAdminDTO Add a new partner admin
   * @throws ApiError
   */
  public static deleteAdminsForPartners(partnerId: string, partnerAdminId: string): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/admins/partners/{partnerID}/admins/{partnerAdminID}",
      path: {
        partnerID: partnerId,
        partnerAdminID: partnerAdminId,
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
   * @param partnerId
   * @param partnerAdminId
   * @param requestBody
   * @returns PartnerAdminDTO Update details of a partner admin
   * @throws ApiError
   */
  public static updateAdminForPartners(
    partnerId: string,
    partnerAdminId: string,
    requestBody: UpdatePartnerAdminRequestDTO,
  ): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/admins/partners/{partnerID}/admins/{partnerAdminID}",
      path: {
        partnerID: partnerId,
        partnerAdminID: partnerAdminId,
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
   * @param requestBody
   * @returns PartnerDTO New partner record
   * @throws ApiError
   */
  public static registerPartner(requestBody: AddPartnerRequestDTO): CancelablePromise<PartnerDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins/partners",
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
   * @param consumerId
   * @param requestBody
   * @returns ConsumerDTO Updated consumer record
   * @throws ApiError
   */
  public static updateConsumer(
    consumerId: string,
    requestBody: AdminUpdateConsumerRequestDTO,
  ): CancelablePromise<ConsumerDTO> {
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
}
