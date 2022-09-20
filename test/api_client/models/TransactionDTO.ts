/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TransactionDTO = {
  _id: string;
  userID: string;
  status:
    | "PENDING"
    | "VALIDATION_FAILED"
    | "VALIDATION_PASSED"
    | "FIAT_INCOMING_INITIATED"
    | "FIAT_INCOMING_COMPLETED"
    | "FIAT_INCOMING_FAILED"
    | "FIAT_REVERSAL_INITIATING"
    | "FIAT_INCOMING_REVERSAL_INITIATED"
    | "FIAT_INCOMING_REVERSAL_FAILED"
    | "FIAT_INCOMING_REVERSED"
    | "CRYPTO_OUTGOING_INITIATING"
    | "CRYPTO_OUTGOING_INITIATED"
    | "CRYPTO_OUTGOING_COMPLETED"
    | "CRYPTO_OUTGOING_FAILED"
    | "COMPLETED"
    | "FAILED";
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
