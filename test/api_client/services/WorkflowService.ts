/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CircleDepositOrWithdrawalRequest } from "../models/CircleDepositOrWithdrawalRequest";
import type { CircleFundsTransferRequestDTO } from "../models/CircleFundsTransferRequestDTO";
import type { UpdateTransactionRequestDTO } from "../models/UpdateTransactionRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class WorkflowService {
  /**
   * Get consumer's wallet ID
   * @returns any
   * @throws ApiError
   */
  public static getConsumerWalletId({ consumerId }: { consumerId: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/wf/circle/wallets/consumers/{consumerID}",
      path: {
        consumerID: consumerId,
      },
    });
  }

  /**
   * Get master wallet ID
   * @returns any
   * @throws ApiError
   */
  public static getMasterWalletId(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/wf/circle/wallets/master",
    });
  }

  /**
   * Get consumer's circle wallet balance
   * @returns any
   * @throws ApiError
   */
  public static getWalletBalance({ walletId }: { walletId: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/wf/circle/wallets/{walletID}/balance",
      path: {
        walletID: walletId,
      },
    });
  }

  /**
   * Debit consumer's circle wallet balance
   * @returns any
   * @throws ApiError
   */
  public static debitWalletBalance({
    walletId,
    requestBody,
  }: {
    walletId: string;
    requestBody: CircleDepositOrWithdrawalRequest;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/wf/circle/wallets/{walletID}/debit",
      path: {
        walletID: walletId,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Credit consumer's circle wallet balance
   * @returns any
   * @throws ApiError
   */
  public static creditWalletBalance({
    walletId,
    requestBody,
  }: {
    walletId: string;
    requestBody: CircleDepositOrWithdrawalRequest;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/wf/circle/wallets/{walletID}/credit",
      path: {
        walletID: walletId,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Transfer funds between circle wallets
   * @returns any
   * @throws ApiError
   */
  public static transferFunds({
    walletId,
    requestBody,
  }: {
    walletId: string;
    requestBody: CircleFundsTransferRequestDTO;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/wf/circle/wallets/{walletID}/transfer",
      path: {
        walletID: walletId,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Updates the transaction
   * @returns any Transaction updated
   * @throws ApiError
   */
  public static patchTransaction({
    transactionId,
    requestBody,
  }: {
    transactionId: string;
    requestBody: UpdateTransactionRequestDTO;
  }): CancelablePromise<any> {
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
}
