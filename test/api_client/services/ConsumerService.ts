/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddCryptoWalletDTO } from "../models/AddCryptoWalletDTO";
import type { AddPaymentMethodDTO } from "../models/AddPaymentMethodDTO";
import type { ConfirmWalletUpdateDTO } from "../models/ConfirmWalletUpdateDTO";
import type { ConsumerDTO } from "../models/ConsumerDTO";
import type { ConsumerLimitsDTO } from "../models/ConsumerLimitsDTO";
import type { UpdateConsumerRequestDTO } from "../models/UpdateConsumerRequestDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class ConsumerService {
  /**
   * Gets details of logged-in consumer
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @returns ConsumerDTO Details of logged-in consumer
   * @throws ApiError
   */
  public static getConsumer(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
  ): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Updates details of logged-in consumer
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param requestBody
   * @returns ConsumerDTO Updated consumer record
   * @throws ApiError
   */
  public static updateConsumer(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    requestBody: UpdateConsumerRequestDTO,
  ): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/consumers",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param requestBody
   * @returns ConsumerDTO Updated consumer record
   * @throws ApiError
   */
  public static addPaymentMethod(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    requestBody: AddPaymentMethodDTO,
  ): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/paymentmethods",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
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
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param paymentToken
   * @returns ConsumerDTO Deleted consumer record
   * @throws ApiError
   */
  public static deletePaymentMethod(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    paymentToken: string,
  ): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/consumers/paymentmethods/{paymentToken}",
      path: {
        paymentToken: paymentToken,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid payment method details`,
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Adds a crypto wallet for the logged-in consumer
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param requestBody
   * @returns ConsumerDTO Updated consumer record with the crypto wallet
   * @throws ApiError
   */
  public static addCryptoWallet(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    requestBody: AddCryptoWalletDTO,
  ): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/wallets",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid crypto wallet details`,
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Deletes a saved wallet for the logged-in consumer
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param walletAddress
   * @returns ConsumerDTO Deleted wallet for consumer
   * @throws ApiError
   */
  public static deleteCryptoWallet(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    walletAddress: string,
  ): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/consumers/wallets/{walletAddress}",
      path: {
        walletAddress: walletAddress,
      },
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid wallet address`,
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Submits the one-time passcode (OTP) to confirm wallet add or update
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @param requestBody
   * @returns ConsumerDTO Verified wallet for consumer
   * @throws ApiError
   */
  public static confirmWalletUpdate(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
    requestBody: ConfirmWalletUpdateDTO,
  ): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/wallets/confirm",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        401: `Invalid OTP`,
      },
    });
  }

  /**
   * Gets transaction limit details for logged-in consumer
   * @param xNobaApiKey
   * @param xNobaSignature
   * @param xNobaTimestamp
   * @returns ConsumerLimitsDTO Consumer limit details
   * @throws ApiError
   */
  public static getConsumerLimits(
    xNobaApiKey: string,
    xNobaSignature: string,
    xNobaTimestamp: string,
  ): CancelablePromise<ConsumerLimitsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers/limits",
      headers: {
        "X-Noba-API-Key": xNobaApiKey,
        "X-Noba-Signature": xNobaSignature,
        "X-Noba-Timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }
}
