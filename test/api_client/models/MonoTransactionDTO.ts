/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type MonoTransactionDTO = {
  id: string;
  nobaTransactionID: string;
  monoTransactionID?: string;
  state: "PENDING" | "SUCCESS" | "EXPIRED";
  collectionLinkID: string;
  createdTimestamp: string;
  updatedTimestamp: string;
};
