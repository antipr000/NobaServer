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

  REFUND = "REFUND",
  PAYMENT = "PAYMENT",
  REVERSAL_PURCHASE = "REVERSAL_PURCHASE",
  REVERSAL_WITHDRAWAL = "REVERSAL_WITHDRAWAL",
  REVERSAL_EXTRACASH = "REVERSAL_EXTRACASH",

  REVERSAL_REFUND = "REVERSAL_REFUND",
  REVERSAL_PAYMENT = "REVERSAL_PAYMENT",
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
  pomeloCardID: string;
  pomeloUserID: string;
  localCurrency: PomeloCurrency;
  localAmount: number;
  settlementCurrency: PomeloCurrency;
  settlementAmount: number;
};

// The small letter values are to map with how Pomelo sends us. This avoids extra translation layer.
export enum PomeloAdjustmentType {
  DEBIT = "debit",
  CREDIT = "credit",
}

export type PomeloTransactionAdjustmentRequest = {
  // request validation parameters.
  endpoint: string;
  timestamp: string;
  rawSignature: string;
  rawBodyBuffer: Buffer;
  idempotencyKey: string;

  // request parameters.
  adjustmentType: PomeloAdjustmentType;
  pomeloTransactionID: string;
  pomeloOriginalTransactionID: string;
  transactionType: PomeloTransactionType;
  merchantName: string;
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

export type PomeloTransactionAdjustmentResponse = PomeloTransactionAuthzResponse;
