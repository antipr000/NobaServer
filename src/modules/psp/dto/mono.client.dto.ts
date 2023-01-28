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

export type MonoTransferRequest = {
  transactionID: string;
  transactionRef: string;
  amount: number;
  currency: MonoCurrency;
  consumerEmail: string;
  consumerName: string;
  documentNumber: string;
  documentType: string;
  bankCode: string;
  accountNumber: string;
  accountType: string;
};

export type MonoTransferResponse = {
  state: string;
  declinationReason?: string;
  batchID: string;
  transferID: string;
};
