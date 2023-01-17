/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type WorkflowTransactionDTO = {
  id: string;
  workflowName: "WALLET_DEPOSIT" | "CONSUMER_WALLET_TRANSFER" | "DEBIT_CONSUMER_WALLET";
  debitConsumerID?: string;
  creditConsumerID?: string;
  debitCurrency: string;
  creditCurrency: string;
  debitAmount: number;
  creditAmount: number;
  exchangeRate: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "IN_PROGRESS";
};
