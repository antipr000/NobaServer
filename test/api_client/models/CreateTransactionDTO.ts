/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CreateTransactionDTO = {
  paymentToken: string;
  type: "NOBA_WALLET";
  leg1: string;
  leg2: string;
  leg1Amount: number;
  leg2Amount: number;
  fixedSide: "fiat" | "crypto";
  destinationWalletAddress: string;
};
