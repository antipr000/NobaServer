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
   * Get partner details of requesting user
   * @param partnerId
   * @returns PartnerDTO Returns the partner details of currently logged in partner admin
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
        400: `User does not have permission`,
      },
    });
  }

  /**
   * Update details of the partner like takeRate
   * @param requestBody
   * @returns PartnerDTO Returns updated partner details
   * @throws ApiError
   */
  public static updatePartner(requestBody: UpdatePartnerRequestDTO): CancelablePromise<PartnerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/partners",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid request`,
      },
    });
  }

  /**
   * Get details for partner admin
   * @param partnerAdminId
   * @returns PartnerAdminDTO Returns details for the requesting partner admin
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
        400: `Not authorized`,
      },
    });
  }

  /**
   * Update details of a partner admin
   * @param partnerAdminId
   * @param requestBody
   * @returns PartnerAdminDTO Update details of a partner admin
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
        400: `Bad request`,
      },
    });
  }

  /**
   * Deletes a parter admin
   * @param partnerAdminId
   * @returns PartnerAdminDTO Deletes a partner admin
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
        400: `Partner admin not found`,
      },
    });
  }

  /**
   * Get all admins for the partner
   * @returns PartnerAdminDTO Returns details for all admins of the partner
   * @throws ApiError
   */
  public static getAllPartnerAdmins(): CancelablePromise<Array<PartnerAdminDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/partners/admins",
      errors: {
        400: `Not authorized`,
      },
    });
  }

  /**
   * Add a new partner admin
   * @param requestBody
   * @returns PartnerAdminDTO Add a new partner admin
   * @throws ApiError
   */
  public static addPartnerAdmin(requestBody: AddPartnerAdminRequestDTO): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/partners/admins",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Bad request`,
      },
    });
  }
}
