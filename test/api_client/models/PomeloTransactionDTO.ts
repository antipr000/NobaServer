/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type PomeloTransactionDTO = {
  id: string;
  pomeloTransactionID: string;
  parentPomeloTransactionID: string;
  pomeloIdempotencyKey: string;
  nobaTransactionID: string;
  pomeloCardID: string;
  pomeloUserID: string;
  amountInUSD: number;
  localAmount: number;
  localCurrency: "USD" | "COP";
  settlementAmount: number;
  settlementCurrency: "USD" | "COP";
  transactionAmount: number;
  transactionCurrency: "USD" | "COP";
  status: "PENDING" | "APPROVED" | "INSUFFICIENT_FUNDS" | "INVALID_MERCHANT" | "INVALID_AMOUNT" | "SYSTEM_ERROR";
  pomeloTransactionType:
    | "PURCHASE"
    | "WITHDRAWAL"
    | "EXTRACASH"
    | "BALANCE_INQUIRY"
    | "REFUND"
    | "PAYMENT"
    | "REVERSAL_PURCHASE"
    | "REVERSAL_WITHDRAWAL"
    | "REVERSAL_EXTRACASH"
    | "REVERSAL_REFUND"
    | "REVERSAL_PAYMENT";
  pointType: "POS" | "ECOMMERCE" | "ATM" | "MOTO";
  entryMode: "MANUAL" | "CHIP" | "CONTACTLESS" | "CREDENTIAL_ON_FILE" | "MAG_STRIPE" | "OTHER" | "UNKNOWN";
  countryCode: string;
  origin: "DOMESTIC" | "INTERNATIONAL";
  source: "ONLINE" | "CLEARING" | "PURGE" | "MANUAL" | "CHARGEBACK_MANUAL" | "TRUST_CREDIT_MANUAL";
  merchantName: string;
  merchantMCC: string;
  createdTimestamp: string;
  updatedTimestamp: string;
};
