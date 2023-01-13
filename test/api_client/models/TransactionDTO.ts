/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ConsumerInformationDTO } from "./ConsumerInformationDTO";

export type TransactionDTO = {
  transactionRef: string;
  workflowName: "CONSUMER_WALLET_TRANSFER" | "DEBIT_CONSUMER_WALLET" | "CREDIT_CONSUMER_WALLET";
  debitConsumer?: ConsumerInformationDTO;
  creditConsumer?: ConsumerInformationDTO;
  debitCurrency: string;
  creditCurrency: string;
  debitAmount: number;
  creditAmount: number;
  exchangeRate: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "IN_PROGRESS";
  createdTimestamp: string;
  updatedTimestamp: string;
  memo?: string;
  transactionEvents?: Array<string>;
};
