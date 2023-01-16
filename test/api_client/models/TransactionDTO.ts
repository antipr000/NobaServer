/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ConsumerInformationDTO } from "./ConsumerInformationDTO";

export type TransactionDTO = {
  transactionRef: string;
  workflowName: "WALLET_DEPOSIT" | "CONSUMER_WALLET_TRANSFER" | "DEBIT_CONSUMER_WALLET";
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
  paymentCollectionLink?: string;
  memo?: string;
  transactionEvents?: Array<string>;
};
