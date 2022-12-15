/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type ConfirmWalletUpdateDTO = {
  walletID: string;
  otp: number;
  notificationMethod?: "Email" | "Phone";
};
