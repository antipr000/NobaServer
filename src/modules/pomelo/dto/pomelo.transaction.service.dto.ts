import {
  PomeloCurrency,
  PomeloEntryMode,
  PomeloOrigin,
  PomeloPointType,
  PomeloSource,
  PomeloTransactionType,
} from "../domain/PomeloTransaction";

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

export type PomeloTransactionAuthzRequest = {
  // request validation parameters.
  endpoint: string;
  timestamp: string;
  rawSignature: string;
  rawBodyBuffer: Buffer;
  idempotencyKey: string;

  // request parameters.
  pomeloTransactionID: string;
  transactionType: PomeloTransactionType;
  merchantName: string;
  merchantMCC: string;
  pomeloCardID: string;
  pomeloUserID: string;
  localCurrency: PomeloCurrency;
  localAmount: number;
  settlementCurrency: PomeloCurrency;
  settlementAmount: number;
  transactionCurrency: PomeloCurrency;
  transactionAmount: number;
  pointType: PomeloPointType;
  entryMode: PomeloEntryMode;
  countryCode: string;
  origin: PomeloOrigin;
  source: PomeloSource;
};

// The small letter values are to map with how Pomelo sends us. This avoids extra translation layer.
export enum PomeloAdjustmentType {
  DEBIT = "debit",
  CREDIT = "credit",
}

export type PomeloTransactionAdjustmentRequest = {
  // request validation parameters.
  endpoint: string;
  unixTimestampSeconds: string;
  rawSignature: string;
  rawBodyBuffer: Buffer;
  idempotencyKey: string;

  // request parameters.
  adjustmentType: PomeloAdjustmentType;
  pomeloTransactionID: string;
  pomeloOriginalTransactionID: string;
  transactionType: PomeloTransactionType;
  merchantName: string;
  merchantMCC: string;
  pomeloCardID: string;
  pomeloUserID: string;
  localCurrency: PomeloCurrency;
  localAmount: number;
  settlementCurrency: PomeloCurrency;
  settlementAmount: number;
  transactionCurrency: PomeloCurrency;
  transactionAmount: number;
  pointType: PomeloPointType;
  entryMode: PomeloEntryMode;
  countryCode: string;
  origin: PomeloOrigin;
  source: PomeloSource;
};

// TODO: "balance" is required for BALANCE_ENQUIRY which is not supported for COL.
export type PomeloTransactionAuthzResponse = {
  message: string;
  summaryStatus: PomeloTransactionAuthzSummaryStatus;
  detailedStatus: PomeloTransactionAuthzDetailStatus;
};

export type PomeloTransactionAdjustmentResponse = PomeloTransactionAuthzResponse;
