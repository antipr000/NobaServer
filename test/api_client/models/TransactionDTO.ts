/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ConsumerInformationDTO } from "./ConsumerInformationDTO";
import type { TransactionEventDTO } from "./TransactionEventDTO";

export type TransactionDTO = {
  /**
   * The reference by which the user identifies this unique transaction
   */
  transactionRef: string;
  /**
   * The workflow being used to process this transaction
   */
  workflowName: "WALLET_DEPOSIT" | "WALLET_TRANSFER" | "WALLET_WITHDRAWAL";
  /**
   * The user whose account is being debited
   */
  debitConsumer?: ConsumerInformationDTO;
  /**
   * The user whose account is being credited
   */
  creditConsumer?: ConsumerInformationDTO;
  /**
   * The currency of the account being debited
   */
  debitCurrency: string;
  /**
   * The currency of the account being credited
   */
  creditCurrency: string;
  /**
   * The amount debited from the debit user's account in the debitCurrency
   */
  debitAmount: number;
  /**
   * The amount credited to the credit user's account in the creditCurrency
   */
  creditAmount: number;
  /**
   * The exchange rate used to convert the debitAmount to the creditAmount
   */
  exchangeRate: string;
  /**
   * The current status of the transaction
   */
  status: "INITIATED" | "COMPLETED" | "FAILED" | "PROCESSING" | "EXPIRED";
  /**
   * The date and time the transaction was created
   */
  createdTimestamp: string;
  /**
   * The date and time the transaction was last updated
   */
  updatedTimestamp: string;
  /**
   * The link used to deposit funds for this transaction
   */
  paymentCollectionLink?: string;
  /**
   * A memo provided by the user when creating the transaction
   */
  memo?: string;
  /**
   * A list of events that have occurred on this transaction
   */
  transactionEvents?: Array<TransactionEventDTO>;
};
