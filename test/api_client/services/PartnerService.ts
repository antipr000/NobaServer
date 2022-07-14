/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddPartnerAdminRequestDTO } from "../models/AddPartnerAdminRequestDTO";
import type { PartnerAdminDTO } from "../models/PartnerAdminDTO";
import type { PartnerDTO } from "../models/PartnerDTO";
import type { UpdatePartnerRequestDTO } from "../models/UpdatePartnerRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class PartnerService {
  /**
   * Gets details of a partner
   * @param partnerId
   * @returns PartnerDTO Details of partner
   * @throws ApiError
   */
  public static getPartner(partnerId: string): CancelablePromise<PartnerDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/partners/{partnerID}",
      path: {
        partnerID: partnerId,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to retrieve partner details`,
      },
    });
  }

  /**
   * Updates details of a partner
   * @param requestBody
   * @returns PartnerDTO Partner details
   * @throws ApiError
   */
  public static updatePartner(requestBody: UpdatePartnerRequestDTO): CancelablePromise<PartnerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/partners",
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
   * @param partnerAdminId
   * @returns PartnerAdminDTO Details of partner admin
   * @throws ApiError
   */
  public static getPartnerAdmin(partnerAdminId: string): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/partners/admins/{partnerAdminID}",
      path: {
        partnerAdminID: partnerAdminId,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to retrieve partner admin`,
      },
    });
  }

  /**
   * Updates details of a partner admin
   * @param partnerAdminId
   * @param requestBody
   * @returns PartnerAdminDTO Details of updated partner admin
   * @throws ApiError
   */
  public static updatePartnerAdmin(
    partnerAdminId: string,
    requestBody: UpdatePartnerRequestDTO,
  ): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/partners/admins/{partnerAdminID}",
      path: {
        partnerAdminID: partnerAdminId,
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
   * @param partnerAdminId
   * @returns PartnerAdminDTO Deleted partner admin record
   * @throws ApiError
   */
  public static deletePartnerAdmin(partnerAdminId: string): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/partners/admins/{partnerAdminID}",
      path: {
        partnerAdminID: partnerAdminId,
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
  public static getAllPartnerAdmins(): CancelablePromise<Array<PartnerAdminDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/partners/admins",
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to retrieve partner admin list`,
      },
    });
  }

  /**
   * Adds a new partner admin
   * @param requestBody
   * @returns PartnerAdminDTO New partner admin record
   * @throws ApiError
   */
  public static addPartnerAdmin(requestBody: AddPartnerAdminRequestDTO): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/partners/admins",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to add a new partner admin`,
      },
    });
  }
}
