/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AddPaymentMethodDTO } from "../models/AddPaymentMethodDTO";
import type { PaymentMethodDTO } from "../models/PaymentMethodDTO";
import type { UserDTO } from "../models/UserDTO";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class UserService {
  /**
   * Get noba user ID of currently logged in user
   * @returns UserDTO Returns the user ID of the currently logged in user
   * @throws ApiError
   */
  public static getUser(): CancelablePromise<UserDTO> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/users",
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Update user details for currently logged in user
   * @returns UserDTO Update user details on the Noba server for currrenly logged in user
   * @throws ApiError
   */
  public static updateUser(): CancelablePromise<UserDTO> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/v1/users",
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }

  /**
   * Get all payment methods for a user
   * @returns PaymentMethodDTO List of all payment methods for the given user ID
   * @throws ApiError
   */
  public static getUserPaymentMethods(): CancelablePromise<Array<PaymentMethodDTO>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/v1/users/paymentmethods/",
      errors: {
        400: `Invalid payment method ID / request parameters`,
      },
    });
  }

  /**
   * Attach a payment method to a user
   * @param requestBody
   * @returns PaymentMethodDTO Add a payment method for the desired user
   * @throws ApiError
   */
  public static addPaymentMethod(requestBody: AddPaymentMethodDTO): CancelablePromise<PaymentMethodDTO> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/v1/users/paymentmethods/",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        400: `Invalid payment method ID / request parameters`,
      },
    });
  }

  /**
   * Remove a payment method from a user
   * @param paymentMethodId
   * @returns string Remove a previously added payment method
   * @throws ApiError
   */
  public static removePaymentMethod(paymentMethodId: string): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/v1/users/paymentmethods/{paymentMethodID}",
      path: {
        paymentMethodID: paymentMethodId,
      },
      errors: {
        400: `Invalid request parameters`,
      },
    });
  }
}
