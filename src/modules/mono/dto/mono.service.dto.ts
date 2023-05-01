import { MonoCurrency, MonoTransactionType } from "../../mono/domain/Mono";

export type CreateMonoTransactionRequest = {
  nobaTransactionID: string;
  amount: number;
  currency: MonoCurrency;
  consumerID: string;
  type: MonoTransactionType;
  nobaPublicTransactionRef?: string;
  withdrawalDetails?: MonoWithdrawalDetails;
};

export type MonoWithdrawalDetails = {
  bankCode: string;
  encryptedAccountNumber: string;
  accountType: string;
  documentNumber: string;
  documentType: string;
};
