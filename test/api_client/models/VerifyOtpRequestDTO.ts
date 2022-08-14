/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type VerifyOtpRequestDTO = {
  emailOrPhone: string;
  otp: number;
  identityType: "CONSUMER" | "PARTNER_ADMIN" | "NOBA_ADMIN";
};
