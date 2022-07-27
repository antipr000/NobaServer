/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeviceVerificationResponseDTO } from "../models/DeviceVerificationResponseDTO";
import type { IDVerificationRequestDTO } from "../models/IDVerificationRequestDTO";
import type { VerificationResultDTO } from "../models/VerificationResultDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class VerificationService {
  /**
   * Checks if verification service is up
   * @returns any Service is up
   * @throws ApiError
   */
  public static getVerificationStatus(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify",
    });
  }

  /**
   * Creates a new session for verification
   * @returns string New session token
   * @throws ApiError
   */
  public static createSession(): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/session",
      errors: {
        400: `Invalid request`,
      },
    });
  }

  /**
   * Verifies consumer-provided information
   * @param sessionKey
   * @param requestBody
   * @returns VerificationResultDTO Verification result
   * @throws ApiError
   */
  public static verifyConsumer(
    sessionKey: string,
    requestBody: IDVerificationRequestDTO,
  ): CancelablePromise<VerificationResultDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/consumerinfo",
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
   * Verifies consumer uploaded identification documents
   * @param sessionKey
   * @param formData
   * @returns VerificationResultDTO Document upload result
   * @throws ApiError
   */
  public static verifyDocument(
    sessionKey: string,
    formData: {
      /**
       * Supported values: passport, national_identity_card, driver_license, other, unknown
       */
      documentType?: string;
      frontImage?: Blob;
      backImage?: Blob;
      photoImage?: Blob;
    },
  ): CancelablePromise<VerificationResultDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/document",
      query: {
        sessionKey: sessionKey,
      },
      formData: formData,
      mediaType: "multipart/form-data",
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Gets result for a previously-submitted document verification
   * @param id
   * @param sessionKey
   * @returns VerificationResultDTO Document verification result
   * @throws ApiError
   */
  public static getDocumentVerificationResult(
    id: string,
    sessionKey: string,
  ): CancelablePromise<VerificationResultDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify/document/result/{id}",
      path: {
        id: id,
      },
      query: {
        sessionKey: sessionKey,
      },
      errors: {
        400: `Invalid request parameters`,
        404: `Document verification request not found`,
      },
    });
  }

  /**
   * Gets device verification result
   * @param sessionKey
   * @returns DeviceVerificationResponseDTO Device verification result
   * @throws ApiError
   */
  public static getDeviceVerificationResult(sessionKey: string): CancelablePromise<DeviceVerificationResponseDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify/device/result",
      query: {
        sessionKey: sessionKey,
      },
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }
}
