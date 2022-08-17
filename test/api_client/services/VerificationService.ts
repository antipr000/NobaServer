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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @returns any Service is up
   * @throws ApiError
   */
  public static getVerificationStatus(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
  ): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
    });
  }

  /**
   * Creates a new session for verification
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @returns string New session token
   * @throws ApiError
   */
  public static createSession(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
  ): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/session",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request`,
      },
    });
  }

  /**
   * Verifies consumer-provided information
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param sessionKey
   * @param requestBody
   * @returns VerificationResultDTO Verification result
   * @throws ApiError
   */
  public static verifyConsumer(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    sessionKey: string,
    requestBody: IDVerificationRequestDTO,
  ): CancelablePromise<VerificationResultDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/consumerinfo",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param sessionKey
   * @param formData
   * @returns VerificationResultDTO Document upload result
   * @throws ApiError
   */
  public static verifyDocument(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
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
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param id
   * @param sessionKey
   * @returns VerificationResultDTO Document verification result
   * @throws ApiError
   */
  public static getDocumentVerificationResult(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    id: string,
    sessionKey: string,
  ): CancelablePromise<VerificationResultDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify/document/result/{id}",
      path: {
        id: id,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param sessionKey
   * @returns DeviceVerificationResponseDTO Device verification result
   * @throws ApiError
   */
  public static getDeviceVerificationResult(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    sessionKey: string,
  ): CancelablePromise<DeviceVerificationResponseDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify/device/result",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      query: {
        sessionKey: sessionKey,
      },
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }
}
