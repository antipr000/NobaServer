import { MonoCurrency } from "../domain/Mono";

export type CollectionIntentCreditedEvent = {
  collectionLinkID: string;
  monoTransactionID: string;
  accountID: string;
  amount: number;
  currency: MonoCurrency;
};

export type BankTransferApprovedEvent = {
  accountID: string;
  batchID: string;
  transferID: string;
  amount: number;
  currency: MonoCurrency;
};

export type BankTransferRejectedEvent = {
  accountID: string;
  batchID: string;
  transferID: string;
  amount: number;
  currency: MonoCurrency;
  state: string;
  declinationReason: string;
};
