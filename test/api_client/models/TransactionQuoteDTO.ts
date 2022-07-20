/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TransactionQuoteDTO = {
  fiatCurrencyCode: string;
  cryptoCurrencyCode: string;
  fixedSide: "fiat" | "crypto";
  fixedAmount: number;
  quotedAmount: number;
  processingFee: number;
  networkFee: number;
  exchangeRate: number;
};
