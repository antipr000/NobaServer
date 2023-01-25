/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AddTransactionEventDTO } from "./AddTransactionEventDTO";

export type UpdateTransactionRequestDTO = {
  status?: "INITIATED" | "COMPLETED" | "FAILED" | "PROCESSING" | "EXPIRED";
  transactionEvent?: AddTransactionEventDTO;
};
