/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type VerifyOtpRequestDTO = {
  /**
   * Email or phone value to identify the user
   */
  emailOrPhone?: string;
  /**
   * One-time password sent to email or phone
   */
  otp: number;
  /**
   * include refresh token to get new token on expiry of current access token
   */
  includeRefreshToken?: boolean;
};
