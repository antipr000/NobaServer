import { PomeloCurrency } from "../domain/PomeloTransaction";

export enum PomeloTransactionAuthzDetailStatus {
  APPROVED = "APPROVED",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  INVALID_MERCHANT = "INVALID_MERCHANT",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  OTHER = "OTHER",
}

export enum PomeloTransactionAuthzSummaryStatus {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum PomeloTransactionType {
  PURCHASE = "PURCHASE",
  WITHDRAWAL = "WITHDRAWAL",
  EXTRACASH = "EXTRACASH",
  BALANCE_INQUIRY = "BALANCE_INQUIRY",
}

export type PomeloTransactionAuthzRequest = {
  // request validation parameters.
  endpoint: string;
  timestamp: string;
  rawSignature: string;
  rawBodyBuffer: Buffer;

  // request parameters.
  pomeloTransactionID: string;
  transactionType: PomeloTransactionType;
  pomeloOriginalTransactionID: string;
  pomeloCardID: string;
  pomeloUserID: string;
  localCurrency: PomeloCurrency;
  localAmount: number;
  settlementCurrency: PomeloCurrency;
  settlementAmount: number;
};

// TODO: "balance" is required for BALANCE_ENQUIRY which is not supported for COL.
export type PomeloTransactionAuthzResponse = {
  message: string;
  summaryStatus: PomeloTransactionAuthzSummaryStatus;
  detailedStatus: PomeloTransactionAuthzDetailStatus;
};
