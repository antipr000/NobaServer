/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type InitiateTransactionDTO = {
  debitConsumerIDOrTag?: string;
  creditConsumerIDOrTag?: string;
  workflowName: "CONSUMER_FUNDS_TRANSFER";
  debitCurrency?: "USD" | "COP";
  debitAmount?: number;
  creditCurrency?: "USD" | "COP";
  creditAmount?: number;
};
