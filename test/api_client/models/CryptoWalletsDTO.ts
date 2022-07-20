/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CryptoWalletsDTO = {
  walletName: string;
  address: string;
  chainType: string;
  isEVMCompatible: boolean;
  status: "Flagged" | "Rejected" | "Approved";
};
