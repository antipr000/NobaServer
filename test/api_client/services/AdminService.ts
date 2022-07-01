/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddPartnerAdminRequestDTO } from "../models/AddPartnerAdminRequestDTO";
import type { AddPartnerRequestDTO } from "../models/AddPartnerRequestDTO";
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
   * Get all transaction metrics for a given partner.
   * @param adminId
   * @returns TransactionStatsDTO Get transaction statistics
   * @throws ApiError
   */
  public static getTransactionMetrics(adminId: string): CancelablePromise<TransactionStatsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/admins/{adminID}/transaction_metrics",
      path: {
        adminID: adminId,
      },
    });
  }

  /**
   * Get all transactions filtered by the specified date range
   * @param adminId
   * @param startDate Format: YYYY-MM-DD, example: 2010-04-27
   * @param endDate Format: YYYY-MM-DD, example: 2010-04-27
   * @returns TransactionDTO
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
   * Creates a new NobaAdmin with a specified role.
   * @param requestBody
   * @returns NobaAdminDTO The newly created Noba Admin.
   * @throws ApiError
   */
  public static createNobaAdmin(requestBody: NobaAdminDTO): CancelablePromise<NobaAdminDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins",
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Updates the role/name of a NobaAdmin.
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
    });
  }

  /**
   * Deletes the NobaAdmin with a given ID
   * @param adminId
   * @returns DeleteNobaAdminDTO The ID of the deleted NobaAdmin.
   * @throws ApiError
   */
  public static deleteNobaAdmin(adminId: string): CancelablePromise<DeleteNobaAdminDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/admins/{adminID}",
      path: {
        adminID: adminId,
      },
    });
  }

  /**
   * Add a new partner admin
   * @param partnerId
   * @param requestBody
   * @returns PartnerAdminDTO Add a new partner admin
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
        400: `Bad request`,
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
        400: `Bad request`,
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
        400: `Bad request`,
      },
    });
  }

  /**
   * Add a new partner
   * @param requestBody
   * @returns PartnerDTO Add a new partner
   * @throws ApiError
   */
  public static registerPartner(requestBody: AddPartnerRequestDTO): CancelablePromise<PartnerDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/admins/partners",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Bad request`,
      },
    });
  }
}
