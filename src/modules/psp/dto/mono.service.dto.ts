import { MonoCurrency } from "../domain/Mono";

export type CreateMonoTransactionRequest = {
  nobaTransactionID: string;
  amount: number;
  currency: MonoCurrency;
  consumerID: string;
};

export type DebitMonoRequest = {
  transactionID: string;
  transactionRef: string;
  amount: number;
  currency: string;
  consumerID: string;
  bankCode: string;
  accountNumber: string;
  accountType: string;
  documentNumber: string;
  documentType: string;
};
