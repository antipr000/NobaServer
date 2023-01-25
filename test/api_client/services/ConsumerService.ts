/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddCryptoWalletDTO } from "../models/AddCryptoWalletDTO";
import type { AddCryptoWalletResponseDTO } from "../models/AddCryptoWalletResponseDTO";
import type { AddPaymentMethodDTO } from "../models/AddPaymentMethodDTO";
import type { ConfirmWalletUpdateDTO } from "../models/ConfirmWalletUpdateDTO";
import type { ConsumerDTO } from "../models/ConsumerDTO";
import type { ConsumerHandleDTO } from "../models/ConsumerHandleDTO";
import type { ConsumerLimitsDTO } from "../models/ConsumerLimitsDTO";
import type { ContactConsumerRequestDTO } from "../models/ContactConsumerRequestDTO";
import type { ContactConsumerResponseDTO } from "../models/ContactConsumerResponseDTO";
import type { EmailVerificationOtpRequest } from "../models/EmailVerificationOtpRequest";
import type { LinkedEmployerDTO } from "../models/LinkedEmployerDTO";
import type { PhoneVerificationOtpRequest } from "../models/PhoneVerificationOtpRequest";
import type { PlaidTokenDTO } from "../models/PlaidTokenDTO";
import type { RegisterWithEmployerDTO } from "../models/RegisterWithEmployerDTO";
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
   * Returns whether the handle is available or not.
   * @returns ConsumerHandleDTO False or True specifying whether the specified 'handle' is already in use or not
   * @throws ApiError
   */
  public static isHandleAvailable({
    xNobaApiKey,
    handle,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    handle: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
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
   * Sends OTP to user's phone to verify update of user profile
   * @returns any OTP sent to user's phone
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
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: UserEmailUpdateRequest;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
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
   * @returns any OTP sent to user's email address
   * @throws ApiError
   */
  public static requestOtpToUpdateEmail({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: EmailVerificationOtpRequest;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<any> {
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
   * @returns ConsumerDTO Updated payment method record
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
   * Updates a payment method for logged-in consumer
   * @returns ConsumerDTO Consumer record with updated payment methods
   * @throws ApiError
   */
  public static updatePaymentMethod({
    xNobaApiKey,
    paymentToken,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    paymentToken: string;
    requestBody: UpdatePaymentMethodDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
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
   * Deletes a payment method for the logged-in consumer
   * @returns ConsumerDTO Consumer record with updated payment methods
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
   * Bulk query contact consumers
   * @returns ContactConsumerResponseDTO List of consumers that are contacts
   * @throws ApiError
   */
  public static getConsumersByContact({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    /**
     * List of contact consumer details
     */
    requestBody: Array<ContactConsumerRequestDTO>;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
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
    query,
    xNobaSignature,
    xNobaTimestamp,
    limit,
  }: {
    xNobaApiKey: string;
    query: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
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
   * Adds a crypto wallet for the logged-in consumer
   * @returns AddCryptoWalletResponseDTO Notficiation type and created wallet id
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
    walletId,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    walletId: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
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
   * Links the consumer with an Employer
   * @returns any Registered Employee record
   * @throws ApiError
   */
  public static registerWithAnEmployer({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: RegisterWithEmployerDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<any> {
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
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
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
   * @returns any
   * @throws ApiError
   */
  public static updateAllocationAmountForAnEmployer({
    xNobaApiKey,
    requestBody,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    requestBody: UpdateEmployerAllocationDTO;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<any> {
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
   * Gets QR code for the logged-in consumer
   * @returns any Base64 of QR code for the logged-in consumer
   * @throws ApiError
   */
  public static getQrCode({
    xNobaApiKey,
    url,
    xNobaSignature,
    xNobaTimestamp,
  }: {
    xNobaApiKey: string;
    url: string;
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
  }): CancelablePromise<any> {
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
   * Add circle wallet to current consumer
   * @returns any
   * @throws ApiError
   */
  public static addConsumerWallet({
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
  }): CancelablePromise<any> {
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
   * @returns any
   * @throws ApiError
   */
  public static getConsumerWalletBalance({
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
  }): CancelablePromise<any> {
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
    xNobaSignature?: string;
    /**
     * Timestamp in milliseconds, use: new Date().getTime().toString()
     */
    xNobaTimestamp?: string;
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
}
