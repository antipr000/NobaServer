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
   * Creates a partner
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param requestBody
   * @returns any
   * @throws ApiError
   */
  public static createPartner(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    requestBody: UpdatePartnerRequestDTO,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/partners",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Updates details of a partner
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param requestBody
   * @returns PartnerDTO Partner details
   * @throws ApiError
   */
  public static updatePartner(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    requestBody: UpdatePartnerRequestDTO,
  ): CancelablePromise<PartnerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/partners",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
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
   * Gets details of a partner
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param partnerId
   * @returns PartnerDTO Details of partner
   * @throws ApiError
   */
  public static getPartner(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    partnerId: string,
  ): CancelablePromise<PartnerDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/partners/{partnerID}",
      path: {
        partnerID: partnerId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to retrieve partner details`,
      },
    });
  }

  /**
   * Gets details of a partner admin
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param partnerAdminId
   * @returns PartnerAdminDTO Details of partner admin
   * @throws ApiError
   */
  public static getPartnerAdmin(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    partnerAdminId: string,
  ): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/partners/admins/{partnerAdminID}",
      path: {
        partnerAdminID: partnerAdminId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to retrieve partner admin`,
      },
    });
  }

  /**
   * Updates details of a partner admin
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param partnerAdminId
   * @param requestBody
   * @returns PartnerAdminDTO Details of updated partner admin
   * @throws ApiError
   */
  public static updatePartnerAdmin(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    partnerAdminId: string,
    requestBody: UpdatePartnerRequestDTO,
  ): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/partners/admins/{partnerAdminID}",
      path: {
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
        400: `Invalid request parameters`,
        403: `User lacks permission to update partner admin`,
      },
    });
  }

  /**
   * Deletes a parter admin
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param partnerAdminId
   * @returns PartnerAdminDTO Deleted partner admin record
   * @throws ApiError
   */
  public static deletePartnerAdmin(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    partnerAdminId: string,
  ): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/partners/admins/{partnerAdminID}",
      path: {
        partnerAdminID: partnerAdminId,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to delete partner admin`,
      },
    });
  }

  /**
   * Gets all admins for the partner
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @returns PartnerAdminDTO All admins of the partner
   * @throws ApiError
   */
  public static getAllPartnerAdmins(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
  ): CancelablePromise<Array<PartnerAdminDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/partners/admins",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to retrieve partner admin list`,
      },
    });
  }

  /**
   * Adds a new partner admin
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param requestBody
   * @returns PartnerAdminDTO New partner admin record
   * @throws ApiError
   */
  public static addPartnerAdmin(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    requestBody: AddPartnerAdminRequestDTO,
  ): CancelablePromise<PartnerAdminDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/partners/admins",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission to add a new partner admin`,
      },
    });
  }
}
