/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeviceVerificationResponseDTO } from "../models/DeviceVerificationResponseDTO";
import type { DocumentVerificationResponseDTO } from "../models/DocumentVerificationResponseDTO";
import type { DocumentVerificationResultDTO } from "../models/DocumentVerificationResultDTO";
import type { IDVerificationURLResponseDTO } from "../models/IDVerificationURLResponseDTO";
import type { SessionResponseDTO } from "../models/SessionResponseDTO";
import type { VerificationResultDTO } from "../models/VerificationResultDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class VerificationService {
  /**
   * Creates a new session for verification
   * @returns SessionResponseDTO New session token
   * @throws ApiError
   */
  public static createSession({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
  }): CancelablePromise<SessionResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/session",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request`,
      },
    });
  }

  /**
   * Verifies consumer-provided information
   * @returns VerificationResultDTO Verification result
   * @throws ApiError
   */
  public static verifyConsumer({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    sessionKey,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    sessionKey: string;
  }): CancelablePromise<VerificationResultDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/consumer",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        sessionKey: sessionKey,
      },
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Verifies consumer uploaded identification documents
   * @returns DocumentVerificationResponseDTO Document upload result
   * @throws ApiError
   */
  public static verifyDocument({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    sessionKey,
    formData,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    sessionKey: string;
    formData: {
      /**
       * Supported values: passport, national_identity_card, driver_license, other, unknown
       */
      documentType?: string;
      frontImage?: Blob;
      backImage?: Blob;
      photoImage?: Blob;
    };
  }): CancelablePromise<DocumentVerificationResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/document",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
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
   * @returns DocumentVerificationResultDTO Document verification result
   * @throws ApiError
   */
  public static getDocumentVerificationResult({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    id,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    id: string;
  }): CancelablePromise<DocumentVerificationResultDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify/document/result/{id}",
      path: {
        id: id,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
        404: `Document verification request not found`,
      },
    });
  }

  /**
   * Retrieves a URL for identity verification
   * @returns IDVerificationURLResponseDTO Document verification KYC URL details
   * @throws ApiError
   */
  public static getIdentityDocumentVerificationUrl({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    sessionKey,
    locale,
    requestPoa,
    requestSelfie,
    requestBack,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    /**
     * Unique verification key for this session
     */
    sessionKey: string;
    /**
     * Unique verification key for this session
     */
    locale: "en-us" | "es-419";
    /**
     * Request proof of address
     */
    requestPoa: boolean;
    /**
     * Request a selfie photo
     */
    requestSelfie: boolean;
    /**
     * Request photo of back of ID
     */
    requestBack: boolean;
  }): CancelablePromise<IDVerificationURLResponseDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify/document/url",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        sessionKey: sessionKey,
        locale: locale,
        requestPOA: requestPoa,
        requestSelfie: requestSelfie,
        requestBack: requestBack,
      },
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Gets device verification result
   * @returns DeviceVerificationResponseDTO Device verification result
   * @throws ApiError
   */
  public static getDeviceVerificationResult({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    sessionKey,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    sessionKey: string;
  }): CancelablePromise<DeviceVerificationResponseDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify/device/result",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
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
