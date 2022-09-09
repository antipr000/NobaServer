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
   * @returns any
   * @throws ApiError
   */
  public static createPartner({
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
  }): CancelablePromise<any> {
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
    requestBody: UpdatePartnerRequestDTO;
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
