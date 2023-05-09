/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BlankResponseDTO } from "../models/BlankResponseDTO";
import type { CaseNotificationWebhookRequestDTO } from "../models/CaseNotificationWebhookRequestDTO";
import type { CreatePayrollRequestDTO } from "../models/CreatePayrollRequestDTO";
import type { CreatePayrollResponseDTO } from "../models/CreatePayrollResponseDTO";
import type { DisbursementDTO } from "../models/DisbursementDTO";
import type { DocumentVerificationWebhookRequestDTO } from "../models/DocumentVerificationWebhookRequestDTO";
import type { EmployeeCreateRequestDTO } from "../models/EmployeeCreateRequestDTO";
import type { EmployeeResponseDTO } from "../models/EmployeeResponseDTO";
import type { EmployerRegisterResponseDTO } from "../models/EmployerRegisterResponseDTO";
import type { EnrichedDisbursementDTO } from "../models/EnrichedDisbursementDTO";
import type { PaginatedEmployeeResponseDTO } from "../models/PaginatedEmployeeResponseDTO";
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
   * Get all employees for employer in Noba
   * @returns PaginatedEmployeeResponseDTO
   * @throws ApiError
   */
  public static getAllEmployees({
    referralId,
    employerId,
    firstNameContains,
    lastNameContains,
    employeeEmail,
    pageOffset,
    pageLimit,
    status,
    createdTimestamp,
    sortStatus,
  }: {
    referralId: string;
    employerId?: string;
    firstNameContains?: string;
    lastNameContains?: string;
    employeeEmail?: string;
    /**
     * Page number, offset 1 means first page results, 2 means second page etc.
     */
    pageOffset?: number;
    /**
     * number of items per page
     */
    pageLimit?: number;
    /**
     * filter by status
     */
    status?: "CREATED" | "INVITED" | "LINKED" | "UNLINKED";
    createdTimestamp?: "asc" | "desc";
    sortStatus?: "asc" | "desc";
  }): CancelablePromise<Array<PaginatedEmployeeResponseDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/webhooks/bubble/employers/{referralID}/employees",
      path: {
        referralID: referralId,
      },
      query: {
        employerID: employerId,
        firstNameContains: firstNameContains,
        lastNameContains: lastNameContains,
        employeeEmail: employeeEmail,
        pageOffset: pageOffset,
        pageLimit: pageLimit,
        status: status,
        createdTimestamp: createdTimestamp,
        sortStatus: sortStatus,
      },
    });
  }

  /**
   * Creates a new employee for employer and sends an invite if specified
   * @returns EmployeeResponseDTO
   * @throws ApiError
   */
  public static createEmployee({
    referralId,
    requestBody,
  }: {
    referralId: string;
    requestBody: EmployeeCreateRequestDTO;
  }): CancelablePromise<EmployeeResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/webhooks/bubble/employers/{referralID}/employees",
      path: {
        referralID: referralId,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Sends an invite to multiple employees
   * @returns BlankResponseDTO
   * @throws ApiError
   */
  public static sendInviteToEmployees({
    referralId,
    formData,
  }: {
    referralId: string;
    formData: {
      file?: Blob;
    };
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/webhooks/bubble/employers/{referralID}/employees/invite",
      path: {
        referralID: referralId,
      },
      formData: formData,
      mediaType: "multipart/form-data",
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
  }: {
    referralId: string;
    payrollId: string;
  }): CancelablePromise<Array<PayrollDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/webhooks/bubble/employers/{referralID}/payrolls/{payrollID}",
      path: {
        referralID: referralId,
        payrollID: payrollId,
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
   * Get all disbursements for payroll in Noba
   * @returns EnrichedDisbursementDTO
   * @throws ApiError
   */
  public static getAllEnrichedDisbursementsForPayroll({
    referralId,
    payrollId,
    pageOffset,
    pageLimit,
    status,
    sortDirection,
    sortBy,
  }: {
    referralId: string;
    payrollId: string;
    /**
     * Page number, offset 1 means first page results, 2 means second page etc.
     */
    pageOffset?: number;
    /**
     * number of items per page
     */
    pageLimit?: number;
    /**
     * filter by status
     */
    status?: "INITIATED" | "COMPLETED" | "FAILED" | "PROCESSING" | "EXPIRED";
    /**
     * sort direction
     */
    sortDirection?: "asc" | "desc";
    /**
     * sort options
     */
    sortBy?: "lastName" | "allocationAmount" | "creditAmount" | "status";
  }): CancelablePromise<Array<EnrichedDisbursementDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/webhooks/bubble/employers/{referralID}/payrolls/{payrollID}/disbursements",
      path: {
        referralID: referralId,
        payrollID: payrollId,
      },
      query: {
        pageOffset: pageOffset,
        pageLimit: pageLimit,
        status: status,
        sortDirection: sortDirection,
        sortBy: sortBy,
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

  /**
   * Authorize the Pomelo Transaction
   * @returns any
   * @throws ApiError
   */
  public static adjustTransactions({ type }: { type: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/webhooks/pomelo/transactions/adjustments/{type}",
      path: {
        type: type,
      },
    });
  }
}
