/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ConsentDTO } from "../models/ConsentDTO";
import type { IDVerificationRequestDTO } from "../models/IDVerificationRequestDTO";
import type { SubdivisionDTO } from "../models/SubdivisionDTO";
import type { VerificationResultDTO } from "../models/VerificationResultDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class VerificationService {
  /**
   * Check if verification service is up
   * @returns any Health check for verification service
   * @throws ApiError
   */
  public static getVerificationStatus(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify",
    });
  }

  /**
   * Get list of country codes that Noba supports
   * @returns any Get country codes for supported countries
   * @throws ApiError
   */
  public static getCountryCodes(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify/countryCodes",
      errors: {
        400: `Invalid request parameters!`,
      },
    });
  }

  /**
   * Get all consents for a given country code
   * @param countryCode
   * @returns ConsentDTO Get all consents
   * @throws ApiError
   */
  public static getConsents(countryCode: string): CancelablePromise<Array<ConsentDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify/consents/{countryCode}",
      path: {
        countryCode: countryCode,
      },
      errors: {
        400: `Invalid request parameters!`,
      },
    });
  }

  /**
   * Get subdivision for the given country code
   * @param countryCode
   * @returns SubdivisionDTO Get subdivision for the given country code
   * @throws ApiError
   */
  public static getSubdivisions(countryCode: string): CancelablePromise<Array<SubdivisionDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/verify/subdivisions/{countryCode}",
      path: {
        countryCode: countryCode,
      },
      errors: {
        400: `Invalid request parameters!`,
      },
    });
  }

  /**
   * Create a new session for verification
   * @returns string Get new session token
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
   * Verify consumer provided information like name, date of birth, address and ssn(for US consumers)
   * @param sessionKey
   * @param requestBody
   * @returns VerificationResultDTO Get verification result
   * @throws ApiError
   */
  public static verifyUser(
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
        400: `Invalid request parameters!`,
      },
    });
  }

  /**
   * Verify consumer uploaded id documents like national id, passport etc
   * @param sessionKey
   * @param formData
   * @returns VerificationResultDTO Get id for submitted verification documents
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
        400: `Invalid request parameters!`,
      },
    });
  }

  /**
   * Get result for a submitted document verification
   * @param id
   * @param sessionKey
   * @returns VerificationResultDTO Get verification result
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
        400: `Invalid id`,
      },
    });
  }
}
