/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type VerifyOtpRequestDTO = {
  /**
   * Email or phone value to identify the user
   */
  emailOrPhone?: string;
  /**
   * This attribute is deprecated and will be removed in future, please use emailOrPhone instead
   */
  email?: string;
  /**
   * Identity type of the user logging in
   */
  identityType: "CONSUMER" | "PARTNER_ADMIN" | "NOBA_ADMIN";
  /**
   * One-time password sent to email or phone
   */
  otp: number;
};
