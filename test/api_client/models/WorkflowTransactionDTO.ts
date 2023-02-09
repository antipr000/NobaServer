/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type WorkflowTransactionDTO = {
  id: string;
  workflowName: "WALLET_WITHDRAWAL" | "WALLET_DEPOSIT" | "WALLET_TRANSFER";
  debitConsumerID?: string;
  creditConsumerID?: string;
  debitCurrency: string;
  creditCurrency: string;
  debitAmount: number;
  creditAmount: number;
  exchangeRate: string;
  status: "INITIATED" | "COMPLETED" | "FAILED" | "PROCESSING" | "EXPIRED";
};
