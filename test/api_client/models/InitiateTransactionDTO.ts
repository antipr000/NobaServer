/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type InitiateTransactionDTO = {
  debitConsumerIDOrTag?: string;
  creditConsumerIDOrTag?: string;
  workflowName: "WALLET_DEPOSIT" | "CONSUMER_WALLET_TRANSFER" | "DEBIT_CONSUMER_WALLET";
  debitCurrency?: "USD" | "COP";
  debitAmount?: number;
  creditCurrency?: "USD" | "COP";
  creditAmount?: number;
  exchangeRate?: number;
  memo?: string;
};
