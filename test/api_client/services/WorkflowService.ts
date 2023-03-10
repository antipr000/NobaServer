/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BlankResponseDTO } from "../models/BlankResponseDTO";
import type { CircleDepositOrWithdrawalRequest } from "../models/CircleDepositOrWithdrawalRequest";
import type { CircleFundsTransferRequestDTO } from "../models/CircleFundsTransferRequestDTO";
import type { CircleTransactionDTO } from "../models/CircleTransactionDTO";
import type { CircleWalletBalanceResponseDTO } from "../models/CircleWalletBalanceResponseDTO";
import type { CircleWalletResponseDTO } from "../models/CircleWalletResponseDTO";
import type { CreateDisbursementRequestDTO } from "../models/CreateDisbursementRequestDTO";
import type { CreateTransactionDTO } from "../models/CreateTransactionDTO";
import type { DebitBankRequestDTO } from "../models/DebitBankRequestDTO";
import type { EmployerWorkflowDTO } from "../models/EmployerWorkflowDTO";
import type { MonoTransactionDTO } from "../models/MonoTransactionDTO";
import type { PayrollDisbursementDTO } from "../models/PayrollDisbursementDTO";
import type { PayrollDTO } from "../models/PayrollDTO";
import type { SendNotificationRequestDTO } from "../models/SendNotificationRequestDTO";
import type { UpdateDisbursementRequestDTO } from "../models/UpdateDisbursementRequestDTO";
import type { UpdatePayrollRequestDTO } from "../models/UpdatePayrollRequestDTO";
import type { UpdateTransactionRequestDTO } from "../models/UpdateTransactionRequestDTO";
import type { WorkflowTransactionDTO } from "../models/WorkflowTransactionDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class WorkflowService {
  /**
   * Creates a transaction from disbursement
   * @returns WorkflowTransactionDTO Transaction created
   * @throws ApiError
   */
  public static createTransaction({
    requestBody,
  }: {
    requestBody: CreateTransactionDTO;
  }): CancelablePromise<WorkflowTransactionDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/wf/v1/transactions",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Failed to create transaction`,
        404: `Requested disbursement is not found`,
      },
    });
  }

  /**
   * Updates the transaction
   * @returns BlankResponseDTO Transaction updated
   * @throws ApiError
   */
  public static patchTransaction({
    transactionId,
    requestBody,
  }: {
    transactionId: string;
    requestBody: UpdateTransactionRequestDTO;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/wf/v1/transactions/{transactionID}",
      path: {
        transactionID: transactionId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Improper or misformatted request`,
        404: `Requested transaction is not found`,
      },
    });
  }

  /**
   * Fetches the transaction for the specified 'transactionID'
   * @returns WorkflowTransactionDTO
   * @throws ApiError
   */
  public static getTransactionByTransactionId({
    transactionId,
  }: {
    transactionId: string;
  }): CancelablePromise<WorkflowTransactionDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/wf/v1/transactions/{transactionID}",
      path: {
        transactionID: transactionId,
      },
    });
  }

  /**
   * Debit money from Noba bank account into consumer account
   * @returns WorkflowTransactionDTO
   * @throws ApiError
   */
  public static debitFromBank({
    requestBody,
  }: {
    requestBody: DebitBankRequestDTO;
  }): CancelablePromise<WorkflowTransactionDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/wf/v1/transactions/debitfrombank",
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Fetches the Mono Transaction for the specified 'nobaTransactionID'
   * @returns MonoTransactionDTO
   * @throws ApiError
   */
  public static getMonoTransactionByNobaTransactionId({
    nobaTransactionId,
  }: {
    nobaTransactionId: string;
  }): CancelablePromise<MonoTransactionDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/wf/v1/mono/nobatransactions/{nobaTransactionID}",
      path: {
        nobaTransactionID: nobaTransactionId,
      },
    });
  }

  /**
   * Gets details of an employer
   * @returns EmployerWorkflowDTO
   * @throws ApiError
   */
  public static getEmployer({ employerId }: { employerId: string }): CancelablePromise<EmployerWorkflowDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/wf/v1/employers/{employerID}",
      path: {
        employerID: employerId,
      },
      errors: {
        404: `Requested employer is not found`,
      },
    });
  }

  /**
   * Creates a disbursement for employee
   * @returns PayrollDisbursementDTO
   * @throws ApiError
   */
  public static createDisbursement({
    payrollId,
    requestBody,
  }: {
    payrollId: string;
    requestBody: CreateDisbursementRequestDTO;
  }): CancelablePromise<PayrollDisbursementDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/wf/v1/payroll/{payrollID}/disbursement",
      path: {
        payrollID: payrollId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Failed to create disbursement`,
        404: `Requested employee is not found`,
      },
    });
  }

  /**
   * Updates the disbursement record for an employee
   * @returns BlankResponseDTO
   * @throws ApiError
   */
  public static patchDisbursement({
    payrollId,
    disbursementId,
    requestBody,
  }: {
    payrollId: string;
    disbursementId: string;
    requestBody: UpdateDisbursementRequestDTO;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/wf/v1/payroll/{payrollID}/disbursement/{disbursementID}",
      path: {
        payrollID: payrollId,
        disbursementID: disbursementId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Failed to update disbursement`,
        404: `Requested disbursement is not found`,
      },
    });
  }

  /**
   * Creates an invoice for employer
   * @returns BlankResponseDTO
   * @throws ApiError
   */
  public static createInvoice({ payrollId }: { payrollId: string }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/wf/v1/payroll/{payrollID}/invoice",
      path: {
        payrollID: payrollId,
      },
      errors: {
        400: `Failed to create invoice`,
        404: `Requested employer is not found`,
      },
    });
  }

  /**
   * Gets details of payroll
   * @returns PayrollDTO
   * @throws ApiError
   */
  public static getPayroll({ payrollId }: { payrollId: string }): CancelablePromise<PayrollDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/wf/v1/payroll/{payrollID}",
      path: {
        payrollID: payrollId,
      },
      errors: {
        404: `Requested payroll is not found`,
      },
    });
  }

  /**
   * Updates the payroll
   * @returns PayrollDTO Payroll updated
   * @throws ApiError
   */
  public static patchPayroll({
    payrollId,
    requestBody,
  }: {
    payrollId: string;
    requestBody: UpdatePayrollRequestDTO;
  }): CancelablePromise<PayrollDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/wf/v1/payroll/{payrollID}",
      path: {
        payrollID: payrollId,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid parameters`,
        404: `Requested payroll is not found`,
      },
    });
  }

  /**
   * Get consumer's wallet ID
   * @returns CircleWalletResponseDTO
   * @throws ApiError
   */
  public static getConsumerWalletId({
    consumerId,
  }: {
    consumerId: string;
  }): CancelablePromise<CircleWalletResponseDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/wf/v1/circle/wallets/consumers/{consumerID}",
      path: {
        consumerID: consumerId,
      },
    });
  }

  /**
   * Get master wallet ID
   * @returns CircleWalletResponseDTO
   * @throws ApiError
   */
  public static getMasterWalletId(): CancelablePromise<CircleWalletResponseDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/wf/v1/circle/wallets/master",
    });
  }

  /**
   * Get consumer's circle wallet balance
   * @returns CircleWalletBalanceResponseDTO
   * @throws ApiError
   */
  public static getWalletBalance({
    walletId,
  }: {
    walletId: string;
  }): CancelablePromise<CircleWalletBalanceResponseDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/wf/v1/circle/wallets/{walletID}/balance",
      path: {
        walletID: walletId,
      },
    });
  }

  /**
   * Debit consumer's circle wallet balance
   * @returns CircleTransactionDTO
   * @throws ApiError
   */
  public static debitWalletBalance({
    walletId,
    requestBody,
  }: {
    walletId: string;
    requestBody: CircleDepositOrWithdrawalRequest;
  }): CancelablePromise<CircleTransactionDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/wf/v1/circle/wallets/{walletID}/debit",
      path: {
        walletID: walletId,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Credit consumer's circle wallet balance
   * @returns CircleTransactionDTO
   * @throws ApiError
   */
  public static creditWalletBalance({
    walletId,
    requestBody,
  }: {
    walletId: string;
    requestBody: CircleDepositOrWithdrawalRequest;
  }): CancelablePromise<CircleTransactionDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/wf/v1/circle/wallets/{walletID}/credit",
      path: {
        walletID: walletId,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Transfer funds between circle wallets
   * @returns CircleTransactionDTO
   * @throws ApiError
   */
  public static transferFunds({
    walletId,
    requestBody,
  }: {
    walletId: string;
    requestBody: CircleFundsTransferRequestDTO;
  }): CancelablePromise<CircleTransactionDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/wf/v1/circle/wallets/{walletID}/transfer",
      path: {
        walletID: walletId,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Send notification from workflow
   * @returns BlankResponseDTO
   * @throws ApiError
   */
  public static sendNotification({
    notificationType,
    requestBody,
  }: {
    notificationType: string;
    requestBody: SendNotificationRequestDTO;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/wf/v1/notification/{notificationType}",
      path: {
        notificationType: notificationType,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }
}
