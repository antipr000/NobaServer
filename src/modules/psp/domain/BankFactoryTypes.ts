export enum BankName {
  MONO = "MONO",
}
export type DebitBankFactoryRequest = {
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

// Contains mono specific fields. This should be expanded to include other banks.
export type DebitBankFactoryResponse = {
  withdrawalID: string;
  state: string;
  declinationReason?: string;
};
