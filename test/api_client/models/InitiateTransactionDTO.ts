/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type InitiateTransactionDTO = {
  debitConsumerIDOrTag?: string;
  creditConsumerIDOrTag?: string;
  workflowName: "BANK_TO_NOBA_WALLET" | "NOBA_WALLET_TO_BANK";
  debitCurrency?: "USD" | "COP";
  debitAmount?: number;
  creditCurrency?: "USD" | "COP";
  creditAmount?: number;
};
