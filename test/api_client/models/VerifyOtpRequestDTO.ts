/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type VerifyOtpRequestDTO = {
  emailOrPhone: string;
  /**
   * This attribute is deprecated and will be removed in future, please use emailOrPhone instead
   */
  email: string;
  identityType: "CONSUMER" | "PARTNER_ADMIN" | "NOBA_ADMIN";
  otp: number;
  /**
   * Creates a user account if user doesn't exist already
   */
  createAccountIfNotExists?: boolean;
};
