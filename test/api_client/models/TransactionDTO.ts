/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { TransactionAmountsDTO } from "./TransactionAmountsDTO";

export type TransactionDTO = {
  /**
   * Internal unique reference to this transaction
   */
  _id: string;
  /**
   * Unique transaction reference number
   */
  transactionID: string;
  /**
   * Internal unique reference to the user who initiated the transaction
   */
  userID: string;
  /**
   * Current status of the transaction
   */
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
    | "INTERNAL_TRANSFER_PENDING"
    | "COMPLETED"
    | "FAILED";
  /**
   * Hash of the transaction as settled on the blockchain
   */
  transactionHash: string;
  /**
   * Timestamp the transaction was submitted
   */
  transactionTimestamp: string;
  /**
   * Wallet address to which the crypto purchase was transferred
   */
  destinationWalletAddress?: string;
  /**
   * Unique ID of the payment method used to fund this transaction
   */
  paymentMethodID: string;
  /**
   * All amounts and currency information related to this transaction
   */
  amounts: TransactionAmountsDTO;
  /**
   * Type of the transaction. Can be one of 'onramp', 'offramp', 'wallet', 'swap'
   */
  type: "onramp" | "offramp" | "swap" | "internal_withdrawal" | "wallet";
};
