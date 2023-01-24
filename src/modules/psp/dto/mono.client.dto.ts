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

export type MonoWithdrawalRequest = {
  transactionID: string;
  transactionRef: string;
  amount: number;
  currency: MonoCurrency;
  consumerEmail: string;
  consumerName: string;
  documentNumber: string;
  documentType: string;
  bankAccountCode: string;
  bankAccountNumber: string;
  bankAccountType: string;
};

export type MonoWithdrawalResponse = {
  withdrawalID: string;
  state: string;
  declinationReason?: string;
};
