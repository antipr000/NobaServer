/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { WithdrawalDTO } from "./WithdrawalDTO";

export type InitiateTransactionDTO = {
  debitConsumerIDOrTag?: string;
  creditConsumerIDOrTag?: string;
  workflowName: "WALLET_DEPOSIT" | "WALLET_TRANSFER" | "WALLET_WITHDRAWAL";
  debitCurrency?: "USD" | "COP";
  debitAmount?: number;
  creditCurrency?: "USD" | "COP";
  creditAmount?: number;
  exchangeRate?: number;
  memo?: string;
  options?: Array<"IS_COLLECTION">;
  withdrawalData?: WithdrawalDTO;
};
