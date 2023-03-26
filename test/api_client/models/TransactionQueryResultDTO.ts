/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { TransactionDTO } from "./TransactionDTO";

export type TransactionQueryResultDTO = {
  items: Array<TransactionDTO>;
  page: number;
  hasNextPage: boolean;
  totalPages: number;
  totalItems: number;
};
