/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CircleFundsMovementRequestDTO } from "../models/CircleFundsMovementRequestDTO";

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
    requestBody: CircleFundsMovementRequestDTO;
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
    requestBody: CircleFundsMovementRequestDTO;
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
}
