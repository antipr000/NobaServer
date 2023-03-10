/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { TransactionEventDTO } from "./TransactionEventDTO";
import type { TransactionFeeDTO } from "./TransactionFeeDTO";

export type WorkflowTransactionDTO = {
  id: string;
  /**
   * The reference by which the user identifies this unique transaction
   */
  transactionRef: string;
  workflowName: "WALLET_WITHDRAWAL" | "WALLET_DEPOSIT" | "WALLET_TRANSFER" | "PAYROLL_DEPOSIT" | "PAYROLL_PROCESSING";
  debitConsumerID?: string;
  creditConsumerID?: string;
  debitCurrency: string;
  creditCurrency: string;
  debitAmount: number;
  creditAmount: number;
  exchangeRate: string;
  status: "INITIATED" | "COMPLETED" | "FAILED" | "PROCESSING" | "EXPIRED";
  /**
   * A memo provided by the user when creating the transaction
   */
  memo?: string;
  /**
   * A list of events that have occurred on this transaction
   */
  transactionEvents?: Array<TransactionEventDTO>;
  /**
   * A list of fees that have been applied to this transaction
   */
  transactionFees: Array<TransactionFeeDTO>;
  totalFees: number;
};
