import { MonoCurrency } from "../domain/Mono";

export type CreateMonoTransactionRequest = {
  nobaTransactionID: string;
  amount: number;
  currency: MonoCurrency;
  consumerID: string;
};

export type WithdrawMonoRequest = {
  transactionID: string;
  amount: number;
  currency: string;

  // Eventually save bank account info in consumer
  bankAccountCode: string;
  bankAccountNumber: string;
  bankAccountType: string;

  // Eventually save bank document info in consumer
  documentNumber: string;
  documentType: string;

  consumerID: string;
};
