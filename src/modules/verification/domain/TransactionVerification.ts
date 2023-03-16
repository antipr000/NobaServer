export type WithdrawalDetails = {
  accountNumber?: string;
  accountType?: string;
  bankCode?: string;
  documentType?: string;
  documentNumber?: string;
  country?: string; // If not provided, we will use the country of the consumer
};

export type TransactionVerification = {
  transactionRef: string;
  debitConsumerID: string; // Our side of the transaction
  creditConsumerID: string; // The other side of the transaction
  workflowName: string;
  creditAmount: number;
  creditCurrency: string;
  debitAmount: number;
  debitCurrency: string;
  withdrawalDetails?: WithdrawalDetails;
};
