import { MonoCurrency } from "./mono.client.dto";

export type CreateMonoTransactionRequest = {
  nobaTransactionID: string;
  amount: number;
  currency: MonoCurrency;
  consumerEmail: string;
  consumerPhone: string;
  consumerName: string;
};
