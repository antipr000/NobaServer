/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { MonoCollectionLinkDepositsDTO } from "./MonoCollectionLinkDepositsDTO";
import type { MonoWithdrawalsDTO } from "./MonoWithdrawalsDTO";

export type MonoTransactionDTO = {
  id: string;
  nobaTransactionID: string;
  type: "COLLECTION_LINK_DEPOSIT" | "WITHDRAWAL";
  state: "PENDING" | "IN_PROGRESS" | "SUCCESS" | "EXPIRED" | "DECLINED" | "CANCELLED" | "DUPLICATED";
  collectionLinkDepositDetails?: MonoCollectionLinkDepositsDTO;
  withdrawalDetails?: MonoWithdrawalsDTO;
  createdTimestamp: string;
  updatedTimestamp: string;
};
