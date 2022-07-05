/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddPaymentMethodDTO } from "../models/AddPaymentMethodDTO";
import type { ConsumerDTO } from "../models/ConsumerDTO";
import type { UpdateConsumerRequestDTO } from "../models/UpdateConsumerRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class ConsumerService {
  /**
   * Get noba consumer details of currently logged in consumer
   * @returns ConsumerDTO Returns consumer details of the currently logged in consumer
   * @throws ApiError
   */
  public static getConsumer(): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers",
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Update consumer details for currently logged in consumer
   * @param requestBody
   * @returns ConsumerDTO Update consumer details on the Noba server for currrenly logged in consumer
   * @throws ApiError
   */
  public static updateConsumer(requestBody: UpdateConsumerRequestDTO): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/consumers",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Attach a payment method to a consumer
   * @param requestBody
   * @returns ConsumerDTO Add a payment method for the logged in user
   * @throws ApiError
   */
  public static addPaymentMethod(requestBody: AddPaymentMethodDTO): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/paymentmethods",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid payment method details`,
      },
    });
  }

  /**
   * Delete a payment method for the logged in consumer
   * @param paymentToken
   * @returns ConsumerDTO Delete a payment method for the logged in user
   * @throws ApiError
   */
  public static deletePaymentMethod(paymentToken: string): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/consumers/paymentmethods/{paymentToken}",
      path: {
        paymentToken: paymentToken,
      },
      errors: {
        400: `Not found error`,
      },
    });
  }
}
