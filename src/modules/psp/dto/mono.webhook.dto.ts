import { MonoCurrency } from "../domain/Mono";

export type CollectionIntentCreditedEvent = {
  collectionLinkID: string;
  monoTransactionID: string;
  accountID: string;
  amount: number;
  currency: MonoCurrency;
};
