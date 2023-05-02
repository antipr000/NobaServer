import Joi from "joi";
import { MonoCurrency, MonoTransactionState } from "../../mono/domain/Mono";

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
  state: MonoTransactionState;
  declinationReason: string;
};

export type MonoAccountCreditedEvent = {
  accountID: string;
  accountNumber: string;
  amount: number;
  currency: MonoCurrency;
  transactionID: string;
  payerDocumentNumber: string;
  payerName: string;
  description: string;
};
