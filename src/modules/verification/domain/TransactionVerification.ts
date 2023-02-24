export type TransactionVerification = {
  transactionRef: string;
  debitConsumerID: string; // Our side of the transaction
  creditConsumerID: string; // The other side of the transaction
  workflowName: string;
  creditAmount: number;
  creditCurrency: string;
  debitAmount: number;
  debitCurrency: string;
};
