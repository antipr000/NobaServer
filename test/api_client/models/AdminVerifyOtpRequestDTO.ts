/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type AdminVerifyOtpRequestDTO = {
  /**
   * Email or phone value to identify the user
   */
  emailOrPhone?: string;
  /**
   * One-time password sent to email or phone
   */
  otp: number;
};
