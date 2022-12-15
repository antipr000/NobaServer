/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type VerifyOtpRequestDTO = {
  /**
   * Email or phone value to identify the user
   */
  emailOrPhone?: string;
  /**
   * Identity type of the user logging in
   */
  identityType: "CONSUMER" | "NOBA_ADMIN";
  /**
   * One-time password sent to email or phone
   */
  otp: number;
};
