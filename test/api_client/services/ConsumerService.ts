/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddCryptoWalletDTO } from "../models/AddCryptoWalletDTO";
import type { AddPaymentMethodDTO } from "../models/AddPaymentMethodDTO";
import type { ConfirmWalletUpdateDTO } from "../models/ConfirmWalletUpdateDTO";
import type { ConsumerDTO } from "../models/ConsumerDTO";
import type { ConsumerLimitsDTO } from "../models/ConsumerLimitsDTO";
import type { PhoneVerificationOtpRequest } from "../models/PhoneVerificationOtpRequest";
import type { PlaidTokenDTO } from "../models/PlaidTokenDTO";
import type { UpdateConsumerRequestDTO } from "../models/UpdateConsumerRequestDTO";
import type { UserPhoneUpdateRequest } from "../models/UserPhoneUpdateRequest";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class ConsumerService {
  /**
   * Gets details of logged-in consumer
   * @returns ConsumerDTO Details of logged-in consumer
   * @throws ApiError
   */
  public static getConsumer({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Updates details of logged-in consumer
   * @returns ConsumerDTO Updated consumer record
   * @throws ApiError
   */
  public static updateConsumer({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: UpdateConsumerRequestDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/consumers",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
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
   * add or updates phone number of logged in user with otp
   * @returns ConsumerDTO Updates the user's phone number
   * @throws ApiError
   */
  public static updatePhone({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: UserPhoneUpdateRequest;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/consumers/phone",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
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
   * add or updates phone number of logged in user with otp
   * @returns any Updated consumer record
   * @throws ApiError
   */
  public static requestOtpToUpdatePhone({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: PhoneVerificationOtpRequest;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/phoneUpdateOtpRequest",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
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
   * Generates a token to connect to Plaid UI
   * @returns PlaidTokenDTO Plaid token
   * @throws ApiError
   */
  public static generatePlaidToken({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<PlaidTokenDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers/paymentmethods/plaid/token",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Adds a payment method for the logged-in consumer
   * @returns ConsumerDTO Updated consumer record
   * @throws ApiError
   */
  public static addPaymentMethod({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: AddPaymentMethodDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/paymentmethods",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
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
   * @returns ConsumerDTO Deleted consumer record
   * @throws ApiError
   */
  public static deletePaymentMethod({
    xNobaApiKey,
    paymentToken,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    paymentToken: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/consumers/paymentmethods/{paymentToken}",
      path: {
        paymentToken: paymentToken,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid payment method details`,
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Adds a crypto wallet for the logged-in consumer
   * @returns ConsumerDTO Updated consumer record with the crypto wallet
   * @throws ApiError
   */
  public static addCryptoWallet({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: AddCryptoWalletDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/wallets",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
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
   * @returns ConsumerDTO Deleted wallet for consumer
   * @throws ApiError
   */
  public static deleteCryptoWallet({
    xNobaApiKey,
    walletAddress,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    walletAddress: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/consumers/wallets/{walletAddress}",
      path: {
        walletAddress: walletAddress,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid wallet address`,
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Submits the one-time passcode (OTP) to confirm wallet add or update
   * @returns ConsumerDTO Verified wallet for consumer
   * @throws ApiError
   */
  public static confirmWalletUpdate({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: ConfirmWalletUpdateDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/wallets/confirm",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
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
   * @returns ConsumerLimitsDTO Consumer limit details
   * @throws ApiError
   */
  public static getConsumerLimits({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<ConsumerLimitsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers/limits",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }
}
