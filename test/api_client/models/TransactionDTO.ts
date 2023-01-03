/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TransactionDTO = {
  transactionRef: string;
  workflowName: "BANK_TO_NOBA_WALLET" | "NOBA_WALLET_TO_BANK";
  debitConsumer: string;
  creditConsumer: string;
  debitCurrency: "USD" | "COP";
  creditCurrency: "USD" | "COP";
  debitAmount: number;
  creditAmount: number;
  exchangeRate: string;
  memo?: string;
};
