/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TransactionDTO = {
  transactionRef: string;
  workflowName: "CONSUMER_WALLET_TRANSFER" | "DEBIT_CONSUMER_WALLET" | "CREDIT_CONSUMER_WALLET";
  debitCurrency: string;
  creditCurrency: string;
  debitAmount: number;
  creditAmount: number;
  exchangeRate: string;
  memo?: string;
};
