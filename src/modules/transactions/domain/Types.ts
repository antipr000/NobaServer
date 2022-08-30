// *** DO NOT CHANGE VALUE *** //
export enum TransactionType {
  ONRAMP = "onramp",
  OFFRAMP = "offramp",
  SWAP = "swap",
}

// *** DO NOT CHANGE/REMOVE THE STATUSES ONCE IN PRODUCTION AS EXISTING TRANSACTION WONT BE VALID, WE CAN ONLY ADD NEW STATUS
export enum TransactionStatus {
  PENDING = "PENDING",

  VALIDATION_FAILED = "VALIDATION_FAILED",
  VALIDATION_PASSED = "VALIDATION_PASSED",

  // Onramp transaction statuses
  FIAT_INCOMING_INITIATED = "FIAT_INCOMING_INITIATED",
  FIAT_INCOMING_COMPLETED = "FIAT_INCOMING_COMPLETED",
  FIAT_INCOMING_FAILED = "FIAT_INCOMING_FAILED",
  FIAT_REVERSAL_INITIATING = "FIAT_REVERSAL_INITIATING",
  FIAT_INCOMING_REVERSAL_INTIIATED = "FIAT_INCOMING_REVERSAL_INITIATED",
  FIAT_INCOMING_REVERSAL_FAILED = "FIAT_INCOMING_REVERSAL_FAILED",
  FIAT_INCOMING_REVERSED = "FIAT_INCOMING_REVERSED",

  CRYPTO_OUTGOING_INITIATING = "CRYPTO_OUTGOING_INITIATING",
  CRYPTO_OUTGOING_INITIATED = "CRYPTO_OUTGOING_INITIATED",
  CRYPTO_OUTGOING_PENDING = "CRYPTO_OUTGOING_PENDING",
  CRYPTO_OUTGOING_COMPLETED = "CRYPTO_OUTGOING_COMPLETED",
  CRYPTO_OUTGOING_FAILED = "CRYPTO_OUTGOING_FAILED",

  //OF-RAMP transaction statuses, complete these when enabling off ramp
  // FIAT_OUTGOING_PENDING = "FIAT_OUTGOING_PENDING",
  // FIAT_OUTGOING_CONFIRMED = "FIAT_OUTGOING_CONFIRMED",
  // FIAT_OUTGOING_FAILED = "FIAT_OUTGOING_FAILED",
  // WALLET_INCOMING_PENDING = "WALLET_INCOMING_PENDING",
  // WALLET_INCOMING_COMPLETED = "WAALLET_INCOMING_COMPLETED",
  // WALLET_INCOMING_FAILED = "WALLET_INCOMING_FAILED",

  // Finality statuses
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

// **** Do not change the enum values as they are used to create SQS queues ***
export enum TransactionQueueName {
  PendingTransactionValidation = "PendingTransactionValidation",
  FiatTransactionInitiator = "FiatTransactionInitiator",
  FiatTransactionInitiated = "FiatTransactionInitiated",
  FiatTransactionCompleted = "FiatTransactionCompleted",
  CryptoTransactionInitiated = "CryptoTransactionInitiated",
  CryptoTransactionCompleted = "CryptoTransactionCompleted",
  TransactionCompleted = "TransactionCompleted",
  TransactionFailed = "TransactionFailed",
  OnChainPendingTransaction = "OnChainPendingTransaction",
}

export interface TransactionStateAttributes {
  transactionStatus: TransactionStatus;
  processingQueue: string;
  waitTimeInMilliSecondsBeforeRequeue: number;
  // Should be populated based on the time it take to process the current status.
  // Do consider the latency due to queue processing delay & traffic.
  maxAllowedMilliSecondsInThisStatus: number;
}

export const allTransactionAttributes: TransactionStateAttributes[] = [
  {
    transactionStatus: TransactionStatus.PENDING,
    processingQueue: TransactionQueueName.PendingTransactionValidation,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.VALIDATION_PASSED,
    processingQueue: TransactionQueueName.FiatTransactionInitiator,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
    processingQueue: TransactionQueueName.FiatTransactionInitiated,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
    processingQueue: TransactionQueueName.FiatTransactionCompleted,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 10 * 60 * 1000, // 10 mins.
  },
  {
    transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATING,
    processingQueue: TransactionQueueName.FiatTransactionCompleted,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 10 * 60 * 1000, // 10 mins.
  },
  {
    transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
    processingQueue: TransactionQueueName.CryptoTransactionInitiated,
    waitTimeInMilliSecondsBeforeRequeue: 30 * 1000, // 30 seconds.
    maxAllowedMilliSecondsInThisStatus: 15 * 60 * 1000, // 15 mins.
  },
  {
    transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
    processingQueue: TransactionQueueName.OnChainPendingTransaction,
    waitTimeInMilliSecondsBeforeRequeue: 2 * 60 * 1000, // 2 mins.
    maxAllowedMilliSecondsInThisStatus: 15 * 60 * 1000, // 15 mins.
  },

  // **************************************************************
  // *                                                            *
  // *                      ERROR SCENARIOS                       *
  // *                                                            *
  // **************************************************************
  {
    transactionStatus: TransactionStatus.VALIDATION_FAILED,
    processingQueue: TransactionQueueName.TransactionFailed,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.FIAT_INCOMING_FAILED,
    processingQueue: TransactionQueueName.TransactionFailed,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.CRYPTO_OUTGOING_FAILED,
    processingQueue: TransactionQueueName.TransactionFailed,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
];

export enum CryptoTransactionStatus {
  PENDING = "pending",
  FAILED = "failed",
  COMPLETED = "completed",
}

export enum CryptoTransactionRequestResultStatus {
  INITIATED = "Initiated",
  FAILED = "Failed",
  OUT_OF_BALANCE = "OutOfBalance",
}

export interface CryptoTransactionRequestResult {
  status: CryptoTransactionRequestResultStatus;
  diagnosisMessage?: string;
  amountReceived: number;
  exchangeRate: number;
  quoteID: string;
  nobaTransferID?: string;
  tradeID: string;
}
