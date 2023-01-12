import { MonoCurrency } from "../domain/Mono";

export type MonoClientCollectionLinkRequest = {
  transactionID: string;
  amount: number;
  currency: MonoCurrency;
  consumerEmail: string;
  consumerPhone: string;
  consumerName: string;
};

export type MonoClientCollectionLinkResponse = {
  collectionLink: string;
  collectionLinkID: string;
};
