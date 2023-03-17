/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddCryptoWalletDTO } from "../models/AddCryptoWalletDTO";
import type { AddCryptoWalletResponseDTO } from "../models/AddCryptoWalletResponseDTO";
import type { BlankResponseDTO } from "../models/BlankResponseDTO";
import type { CircleWalletBalanceResponseDTO } from "../models/CircleWalletBalanceResponseDTO";
import type { CircleWalletResponseDTO } from "../models/CircleWalletResponseDTO";
import type { ConfirmWalletUpdateDTO } from "../models/ConfirmWalletUpdateDTO";
import type { ConsumerDTO } from "../models/ConsumerDTO";
import type { ConsumerHandleDTO } from "../models/ConsumerHandleDTO";
import type { ConsumerLimitsDTO } from "../models/ConsumerLimitsDTO";
import type { ContactConsumerRequestDTO } from "../models/ContactConsumerRequestDTO";
import type { ContactConsumerResponseDTO } from "../models/ContactConsumerResponseDTO";
import type { EmailVerificationOtpRequest } from "../models/EmailVerificationOtpRequest";
import type { LinkedEmployerDTO } from "../models/LinkedEmployerDTO";
import type { PhoneVerificationOtpRequest } from "../models/PhoneVerificationOtpRequest";
import type { QRCodeDTO } from "../models/QRCodeDTO";
import type { RegisterWithEmployerDTO } from "../models/RegisterWithEmployerDTO";
import type { RequestEmployerDTO } from "../models/RequestEmployerDTO";
import type { UpdateConsumerRequestDTO } from "../models/UpdateConsumerRequestDTO";
import type { UpdateEmployerAllocationDTO } from "../models/UpdateEmployerAllocationDTO";
import type { UpdatePaymentMethodDTO } from "../models/UpdatePaymentMethodDTO";
import type { UserEmailUpdateRequest } from "../models/UserEmailUpdateRequest";
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
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
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
    xNobaSignature,
    xNobaTimestamp,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    requestBody: UpdateConsumerRequestDTO;
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
   * Returns whether the handle is available or not.
   * @returns ConsumerHandleDTO False or True specifying whether the specified 'handle' is already in use or not
   * @throws ApiError
   */
  public static isHandleAvailable({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    handle,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    handle: string;
  }): CancelablePromise<ConsumerHandleDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers/handles/availability",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        handle: handle,
      },
      errors: {
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Adds or updates phone number of logged in user with OTP
   * @returns ConsumerDTO Updated the user's phone number
   * @throws ApiError
   */
  public static updatePhone({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    requestBody: UserPhoneUpdateRequest;
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
   * Sends OTP to user's phone to verify update of user profile
   * @returns BlankResponseDTO OTP sent to user's phone
   * @throws ApiError
   */
  public static requestOtpToUpdatePhone({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    requestBody: PhoneVerificationOtpRequest;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/phone/verify",
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
   * Adds or updates email address of logged in user with OTP
   * @returns ConsumerDTO Updated the user's email address
   * @throws ApiError
   */
  public static updateEmail({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    requestBody: UserEmailUpdateRequest;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/consumers/email",
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
   * Sends OTP to user's email to verify update of user profile
   * @returns BlankResponseDTO OTP sent to user's email address
   * @throws ApiError
   */
  public static requestOtpToUpdateEmail({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    requestBody: EmailVerificationOtpRequest;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/email/verify",
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
   * Updates a payment method for logged-in consumer
   * @returns ConsumerDTO Consumer record with updated payment methods
   * @throws ApiError
   */
  public static updatePaymentMethod({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    paymentToken,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    paymentToken: string;
    requestBody: UpdatePaymentMethodDTO;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/consumers/paymentmethods/{paymentToken}",
      path: {
        paymentToken: paymentToken,
      },
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
        404: `Payment method not found for Consumer`,
      },
    });
  }

  /**
   * Bulk query contact consumers
   * @returns ContactConsumerResponseDTO List of consumers that are contacts
   * @throws ApiError
   */
  public static getConsumersByContact({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    /**
     * List of contact consumer details
     */
    requestBody: Array<ContactConsumerRequestDTO>;
  }): CancelablePromise<Array<ContactConsumerResponseDTO>> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/devicecontacts",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid contact consumer details`,
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Search for consumers based on public information.
   * @returns ContactConsumerResponseDTO List of consumers that match the search criteria
   * @throws ApiError
   */
  public static searchConsumers({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    query,
    limit,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    query: string;
    limit?: number;
  }): CancelablePromise<Array<ContactConsumerResponseDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers/search",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        query: query,
        limit: limit,
      },
      errors: {
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Subscribe to push notifications
   * @returns BlankResponseDTO Successfully subscribed to push notifications
   * @throws ApiError
   */
  public static subscribeToPushNotifications({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    pushToken,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    pushToken: string;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/subscribe/push/{pushToken}",
      path: {
        pushToken: pushToken,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      errors: {
        400: `Invalid push notification details`,
        403: `Logged-in user is not a Consumer`,
      },
    });
  }

  /**
   * Unsubscribe from push notifications
   * @returns BlankResponseDTO Successfully unsubscribed from push notifications
   * @throws ApiError
   */
  public static unsubscribeFromPushNotifications({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    pushToken,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    pushToken: string;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/unsubscribe/push/{pushToken}",
      path: {
        pushToken: pushToken,
      },
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
    });
  }

  /**
   * Adds a crypto wallet for the logged-in consumer
   * @returns AddCryptoWalletResponseDTO Notficiation type and created wallet id
   * @throws ApiError
   */
  public static addCryptoWallet({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    requestBody: AddCryptoWalletDTO;
  }): CancelablePromise<AddCryptoWalletResponseDTO> {
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
    xNobaSignature,
    xNobaTimestamp,
    walletId,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    walletId: string;
  }): CancelablePromise<ConsumerDTO> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/consumers/wallets/{walletID}",
      path: {
        walletID: walletId,
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
    xNobaSignature,
    xNobaTimestamp,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    requestBody: ConfirmWalletUpdateDTO;
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
   * Links the consumer with an Employer
   * @returns BlankResponseDTO Registered Employee record
   * @throws ApiError
   */
  public static registerWithAnEmployer({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    requestBody: RegisterWithEmployerDTO;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/employers",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Lists all the Employers the current Consumer is associated with
   * @returns LinkedEmployerDTO
   * @throws ApiError
   */
  public static listLinkedEmployers({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
  }): CancelablePromise<Array<LinkedEmployerDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers/employers",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
    });
  }

  /**
   * Updates the allocation amount for a specific employer
   * @returns LinkedEmployerDTO
   * @throws ApiError
   */
  public static updateAllocationAmountForAnEmployer({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    requestBody: UpdateEmployerAllocationDTO;
  }): CancelablePromise<LinkedEmployerDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/consumers/employers",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Request employer to join Noba
   * @returns BlankResponseDTO Email Sent
   * @throws ApiError
   */
  public static postEmployerRequestEmail({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    requestBody,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    requestBody: RequestEmployerDTO;
  }): CancelablePromise<BlankResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/consumers/employers/request",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      body: requestBody,
      mediaType: "application/json",
    });
  }

  /**
   * Gets QR code for the logged-in consumer
   * @returns QRCodeDTO Base64 of QR code for the logged-in consumer
   * @throws ApiError
   */
  public static getQrCode({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
    url,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    url: string;
  }): CancelablePromise<QRCodeDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/consumers/qrcode",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        url: url,
      },
      errors: {
        403: `Logged-in user is not a Consumer`,
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
    transactionType,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
    transactionType?: "NOBA_WALLET";
  }): CancelablePromise<ConsumerLimitsDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v2/consumers/limits",
      headers: {
        "x-noba-api-key": xNobaApiKey,
        "x-noba-signature": xNobaSignature,
        "x-noba-timestamp": xNobaTimestamp,
      },
      query: {
        transactionType: transactionType,
      },
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Add circle wallet to current consumer
   * @returns CircleWalletResponseDTO
   * @throws ApiError
   */
  public static addConsumerWallet({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
  }): CancelablePromise<CircleWalletResponseDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/circle/wallet",
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
   * Get current consumer's circle wallet balance
   * @returns CircleWalletBalanceResponseDTO
   * @throws ApiError
   */
  public static getConsumerWalletBalance({
    xNobaApiKey,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    xNobaSignature: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp: string;
  }): CancelablePromise<CircleWalletBalanceResponseDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/circle/wallet/balance",
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
}
