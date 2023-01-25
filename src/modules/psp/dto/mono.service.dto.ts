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

  // Eventually save bank account info in consumer
  bankCode: string;
  accountNumber: string;
  accountType: string;

  // Eventually save bank document info in consumer
  documentNumber: string;
  documentType: string;

  consumerID: string;
};
