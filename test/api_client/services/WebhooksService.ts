/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BlankResponseDTO } from "../models/BlankResponseDTO";
import type { CaseNotificationWebhookRequestDTO } from "../models/CaseNotificationWebhookRequestDTO";
import type { CreatePayrollRequestDTO } from "../models/CreatePayrollRequestDTO";
import type { CreatePayrollResponseDTO } from "../models/CreatePayrollResponseDTO";
import type { DisbursementDTO } from "../models/DisbursementDTO";
import type { DocumentVerificationWebhookRequestDTO } from "../models/DocumentVerificationWebhookRequestDTO";
import type { EmployerRegisterResponseDTO } from "../models/EmployerRegisterResponseDTO";
import type { PayrollDTO } from "../models/PayrollDTO";
import type { RegisterEmployerRequestDTO } from "../models/RegisterEmployerRequestDTO";
import type { UpdateEmployeeRequestDTO } from "../models/UpdateEmployeeRequestDTO";
import type { UpdateEmployerRequestDTO } from "../models/UpdateEmployerRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class WebhooksService {
  /**
   * Checks if the transaction parameters are valid
   * @returns any
   * @throws ApiError
   */
  public static consumePaymentWebhooks(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/vendors/checkout/webhooks",
    });
  }

  /**
   * Handle all the Mono Webhook requests
   * @returns any
   * @throws ApiError
   */
  public static processWebhookRequests({ monoSignature }: { monoSignature: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/webhooks/mono",
      headers: {
        "mono-signature": monoSignature,
      },
    });
  }

  /**
   * @returns any
   * @throws ApiError
   */
  public static postDocumentVerificationResult({
    xSardineSignature,
    requestBody,
  }: {
    xSardineSignature: string;
    requestBody: DocumentVerificationWebhookRequestDTO;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/webhook/document/result",
      headers: {
        "x-sardine-signature": xSardineSignature,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * @returns any
   * @throws ApiError
   */
  public static postCaseNotification({
    xSardineSignature,
    requestBody,
  }: {
    xSardineSignature: string;
    requestBody: CaseNotificationWebhookRequestDTO;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/verify/webhook/case/notification",
      headers: {
        "x-sardine-signature": xSardineSignature,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Register the Employer in Noba
   * @returns EmployerRegisterResponseDTO
   * @throws ApiError
   */
  public static registerEmployer({
    requestBody,
  }: {
    requestBody: RegisterEmployerRequestDTO;
  }): CancelablePromise<EmployerRegisterResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/webhooks/bubble/employers",
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Creates payroll for employer in Noba
   * @returns CreatePayrollResponseDTO
   * @throws ApiError
   */
  public static createPayroll({
    referralId,
    requestBody,
  }: {
    referralId: string;
    requestBody: CreatePayrollRequestDTO;
  }): CancelablePromise<CreatePayrollResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/webhooks/bubble/employers/{referralID}/payroll",
      path: {
        referralID: referralId,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Get all payrolls for employer in Noba
   * @returns PayrollDTO
   * @throws ApiError
   */
  public static getAllPayrolls({ referralId }: { referralId: string }): CancelablePromise<Array<PayrollDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/webhooks/bubble/employers/{referralID}/payrolls",
      path: {
        referralID: referralId,
      },
    });
  }

  /**
   * Get specific payroll for employer in Noba
   * @returns PayrollDTO
   * @throws ApiError
   */
  public static getPayroll({
    referralId,
    payrollId,
    shouldIncludeDisbursements,
  }: {
    referralId: string;
    payrollId: string;
    shouldIncludeDisbursements: "true" | "false";
  }): CancelablePromise<Array<PayrollDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/webhooks/bubble/employers/{referralID}/payrolls/{payrollID}",
      path: {
        referralID: referralId,
        payrollID: payrollId,
      },
      query: {
        shouldIncludeDisbursements: shouldIncludeDisbursements,
      },
    });
  }

  /**
   * Get all disbursements for employee in Noba
   * @returns DisbursementDTO
   * @throws ApiError
   */
  public static getAllDisbursementsForEmployee({
    referralId,
    employeeId,
  }: {
    referralId: string;
    employeeId: string;
  }): CancelablePromise<Array<DisbursementDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/webhooks/bubble/employers/{referralID}/disbursements/{employeeID}",
      path: {
        referralID: referralId,
        employeeID: employeeId,
      },
    });
  }

  /**
   * Update the Employer in Noba
   * @returns BlankResponseDTO
   * @throws ApiError
   */
  public static updateEmployer({
    referralId,
    requestBody,
  }: {
    referralId: string;
    requestBody: UpdateEmployerRequestDTO;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/webhooks/bubble/employers/{referralID}",
      path: {
        referralID: referralId,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Update the Employee in Noba
   * @returns BlankResponseDTO
   * @throws ApiError
   */
  public static updateEmployee({
    employeeId,
    requestBody,
  }: {
    employeeId: string;
    requestBody: UpdateEmployeeRequestDTO;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/webhooks/bubble/employees/{employeeID}",
      path: {
        employeeID: employeeId,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Authorize the Pomelo Transaction
   * @returns any
   * @throws ApiError
   */
  public static authorizeTransactions(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/webhooks/pomelo/transactions/authorizations",
    });
  }
}
