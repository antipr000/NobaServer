import { Producer } from "sqs-producer";
import { environmentDependentQueueUrl } from "../../../infra/aws/services/CommonUtils";

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

export const getTransactionQueueProducers = (): Record<TransactionQueueName, Producer> => {
  const transactionQueueMap = {} as Record<TransactionQueueName, Producer>;
  Object.values(TransactionQueueName).forEach(queueName => {
    transactionQueueMap[queueName] = new Producer({
      queueUrl: environmentDependentQueueUrl(queueName),
    });
  });
  return transactionQueueMap;
};
