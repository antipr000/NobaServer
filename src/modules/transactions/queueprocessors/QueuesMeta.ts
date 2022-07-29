// **** Do not change the enum values as they are used to create SQS queues ***
export enum TransactionQueueName {
  PendingTransactionValidation = "PendingTransactionValidation",
  FiatTransactionInitiator = "FiatTransactionInitiator",
  FiatTransactionInitiated = "FiatTransactionInitated", // TODO: Fix typo (missing i in initiated)
  FiatTransactionCompleted = "FiatTransactionCompleted",
  CryptoTransactionInitiated = "CryptoTransactionInitiated",
  CryptoTransactionCompleted = "CryptoTransactionCompleted",
  TransactionCompleted = "TransactionCompleted",
  TransactionFailed = "TransactionFailed",
  OnChainPendingTransaction = "OnChainPendingTransaction",
}
