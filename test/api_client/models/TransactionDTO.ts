/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TransactionDTO = {
  _id: string;
  userID: string;
  status:
    | "INITIATED"
    | "FIAT_INCOMING_PENDING"
    | "FIAT_INCOMING_CONFIRMED"
    | "FIAT_INCOMING_FAILED"
    | "FIAT_INCOMING_REVERSED"
    | "FIAT_OUTGOING_PENDING"
    | "FIAT_OUTGOING_CONFIRMED"
    | "FIAT_OUTGOING_FAILED"
    | "WALLET_INCOMING_PENDING"
    | "WALLET_INCOMING_COMPLETED"
    | "WALLET_INCOMING_FAILED"
    | "WALLET_OUTGOING_PENDING"
    | "WALLET_OUTGOING_COMPLETED"
    | "WALLET_OUTGOING_FAILED"
    | "COMPLETED";
  type: "onramp" | "offramp" | "swap";
  statusMessage?: string;
  leg1: string;
  leg2: string;
  /**
   * Amount to be exchaged. in case of offramp it is amount of fiat currency, offramp amount of crypto, in case of swap the source currency etc.
   */
  baseAmount: number;
  leg1Amount: number;
  leg2Amount: number;
  transactionTimestamp: string;
  paymentMethodID?: string;
  fiatTransactionID?: string;
  cryptoTransactionID?: string;
  /**
   * Destination wallet address to transfer crypto to in case of off ramp transaction
   */
  destinationWalletAddress?: string;
};
