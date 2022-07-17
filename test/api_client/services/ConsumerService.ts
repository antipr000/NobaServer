/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddPaymentMethodDTO } from "../models/AddPaymentMethodDTO";
import type { ConsumerDTO } from "../models/ConsumerDTO";
import type { ConsumerLimitsDTO } from "../models/ConsumerLimitsDTO";
import type { UpdateConsumerRequestDTO } from "../models/UpdateConsumerRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class ConsumerService {
  /**
   * Gets details of logged-in consumer
   * @returns ConsumerDTO Details of logged-in consumer
   * @throws ApiError
   */
  public static getConsumer(): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers",
      errors: {
        400: `Invalid request parameters`,
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Updates details of logged-in consumer
   * @param requestBody
   * @returns ConsumerDTO Updated consumer record
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
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Adds a payment method for the logged-in consumer
   * @param requestBody
   * @returns ConsumerDTO Updated consumer record
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
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Deletes a payment method for the logged-in consumer
   * @param paymentToken
   * @returns ConsumerDTO Deleted consumer record
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
        400: `Invalid payment method details`,
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Gets transaction limit details for logged-in consumer
   * @returns ConsumerLimitsDTO Consumer limit details
   * @throws ApiError
   */
  public static getConsumerLimits(): CancelablePromise<ConsumerLimitsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers/limits/",
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }
}
