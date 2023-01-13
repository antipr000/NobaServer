/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AddTransactionEventDTO } from "./AddTransactionEventDTO";

export type UpdateTransactionRequestDTO = {
  status?: "PENDING" | "SUCCESS" | "FAILED" | "IN_PROGRESS";
  transactionEvent?: AddTransactionEventDTO;
};
