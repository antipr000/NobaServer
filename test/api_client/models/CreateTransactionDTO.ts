/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CreateTransactionDTO = {
  paymentMethodID: string;
  type: "onramp" | "offramp" | "swap";
  leg1: string;
  leg2: string;
  leg1Amount: number;
  leg2Amount: number;
  destinationWalletAddress?: string;
};
