import { SortOrder } from "../../../core/infra/PaginationTypes";

// *** DO NOT CHANGE VALUE *** //
export enum TransactionType {
  ONRAMP = "onramp",
  OFFRAMP = "offramp",
  SWAP = "swap",
  INTERNAL_WITHDRAWAL = "internal_withdrawal",
  NOBA_WALLET = "wallet",
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
  FIAT_INCOMING_REVERSAL_INITIATED = "FIAT_INCOMING_REVERSAL_INITIATED",
  FIAT_INCOMING_REVERSAL_FAILED = "FIAT_INCOMING_REVERSAL_FAILED",
  FIAT_INCOMING_REVERSED = "FIAT_INCOMING_REVERSED",

  CRYPTO_OUTGOING_INITIATING = "CRYPTO_OUTGOING_INITIATING",
  CRYPTO_OUTGOING_INITIATED = "CRYPTO_OUTGOING_INITIATED",
  CRYPTO_OUTGOING_COMPLETED = "CRYPTO_OUTGOING_COMPLETED",
  CRYPTO_OUTGOING_FAILED = "CRYPTO_OUTGOING_FAILED",

  INTERNAL_TRANSFER_PENDING = "INTERNAL_TRANSFER_PENDING",

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
  InternalTransferInitiated = "InternalTransferInitiated",
  InternalTransferInitiator = "InternalTransferInitiator",
  TransactionCompleted = "TransactionCompleted",
  TransactionFailed = "TransactionFailed",
  OnChainPendingTransaction = "OnChainPendingTransaction",
}

export interface TransactionStateAttributes {
  transactionStatus: TransactionStatus;
  transactionType: TransactionType[];
  processingQueue: string;
  waitTimeInMilliSecondsBeforeRequeue: number;
  // Should be populated based on the time it take to process the current status.
  // Do consider the latency due to queue processing delay & traffic.
  maxAllowedMilliSecondsInThisStatus: number;
}

export const allTransactionAttributes: TransactionStateAttributes[] = [
  {
    transactionStatus: TransactionStatus.PENDING,
    transactionType: [TransactionType.ONRAMP, TransactionType.NOBA_WALLET, TransactionType.INTERNAL_WITHDRAWAL],
    processingQueue: TransactionQueueName.PendingTransactionValidation,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.VALIDATION_PASSED,
    transactionType: [TransactionType.ONRAMP, TransactionType.NOBA_WALLET],
    processingQueue: TransactionQueueName.FiatTransactionInitiator,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.VALIDATION_PASSED,
    transactionType: [TransactionType.INTERNAL_WITHDRAWAL],
    processingQueue: TransactionQueueName.InternalTransferInitiator,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
    transactionType: [TransactionType.ONRAMP, TransactionType.NOBA_WALLET],
    processingQueue: TransactionQueueName.FiatTransactionInitiated,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.FIAT_INCOMING_COMPLETED,
    transactionType: [TransactionType.ONRAMP, TransactionType.NOBA_WALLET],
    processingQueue: TransactionQueueName.FiatTransactionCompleted,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 10 * 60 * 1000, // 10 mins.
  },
  {
    transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATING,
    transactionType: [TransactionType.ONRAMP, TransactionType.NOBA_WALLET],
    processingQueue: TransactionQueueName.FiatTransactionCompleted,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 10 * 60 * 1000, // 10 mins.
  },
  {
    transactionStatus: TransactionStatus.INTERNAL_TRANSFER_PENDING,
    transactionType: [TransactionType.INTERNAL_WITHDRAWAL],
    processingQueue: TransactionQueueName.InternalTransferInitiated,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.CRYPTO_OUTGOING_INITIATED,
    transactionType: [TransactionType.ONRAMP, TransactionType.NOBA_WALLET],
    processingQueue: TransactionQueueName.CryptoTransactionInitiated,
    waitTimeInMilliSecondsBeforeRequeue: 30 * 1000, // 30 seconds.
    maxAllowedMilliSecondsInThisStatus: 15 * 60 * 1000, // 15 mins.
  },
  {
    transactionStatus: TransactionStatus.CRYPTO_OUTGOING_COMPLETED,
    transactionType: [TransactionType.ONRAMP, TransactionType.NOBA_WALLET],
    processingQueue: TransactionQueueName.OnChainPendingTransaction,
    waitTimeInMilliSecondsBeforeRequeue: 2 * 60 * 1000, // 2 mins.
    maxAllowedMilliSecondsInThisStatus: 2 * 60 * 60 * 1000, // 2 hrs.
  },

  // **************************************************************
  // *                                                            *
  // *                      ERROR SCENARIOS                       *
  // *                                                            *
  // **************************************************************
  {
    transactionStatus: TransactionStatus.VALIDATION_FAILED,
    transactionType: [TransactionType.ONRAMP, TransactionType.NOBA_WALLET, TransactionType.INTERNAL_WITHDRAWAL],
    processingQueue: TransactionQueueName.TransactionFailed,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.FIAT_INCOMING_FAILED,
    transactionType: [TransactionType.ONRAMP, TransactionType.NOBA_WALLET],
    processingQueue: TransactionQueueName.TransactionFailed,
    waitTimeInMilliSecondsBeforeRequeue: 10 * 1000, // 10 seconds.
    maxAllowedMilliSecondsInThisStatus: 5 * 60 * 1000, // 5 mins.
  },
  {
    transactionStatus: TransactionStatus.CRYPTO_OUTGOING_FAILED,
    transactionType: [TransactionType.ONRAMP, TransactionType.NOBA_WALLET],
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

import { ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionProps } from "./Transaction";

export enum TransactionsQuerySortField {
  transactionTimestamp = "transactionTimestamp",
  leg1Amount = "leg1Amount",
  leg2Amount = "leg2Amount",
  leg1 = "leg1",
  leg2 = "leg2",
}

export class TransactionFilterOptions {
  @ApiPropertyOptional({ description: "Consumer ID whose transactions is needed" })
  consumerID?: string;

  @ApiPropertyOptional({
    description: "Format: YYYY-MM-DD, example: 2010-04-27",
  })
  startDate?: string;

  @ApiPropertyOptional({
    description: "Format: YYYY-MM-DD, example: 2010-04-27",
  })
  endDate?: string;

  @ApiPropertyOptional({
    description: "number of pages to skip, offset 0 means first page results, 1 means second page etc.",
  })
  pageOffset?: number;

  @ApiPropertyOptional({ description: "number of items per page" })
  pageLimit?: number;

  @ApiPropertyOptional({ description: "filter for a particular credit currency" })
  creditCurrency?: string;

  @ApiPropertyOptional({ description: "filter for a particular debit currency" })
  debitCurrency?: string;

  @ApiPropertyOptional({
    enum: Object.values(TransactionStatus),
    description: "filter for a particular transaction status",
  })
  transactionStatus?: TransactionStatus;

  @ApiPropertyOptional()
  sortField?: TransactionsQuerySortField;

  @ApiPropertyOptional()
  sortOrder?: SortOrder;

  @ApiPropertyOptional()
  fiatCurrency?: string;

  @ApiPropertyOptional()
  cryptoCurrency?: string;
}

export function transactionPropFromQuerySortField(transactionQuerySortField: TransactionsQuerySortField) {
  if (!transactionQuerySortField) {
    return undefined;
  }
  const mp: Record<TransactionsQuerySortField, keyof TransactionProps> = {
    transactionTimestamp: "transactionTimestamp",
    leg1Amount: "leg1Amount",
    leg2Amount: "leg2Amount",
    leg1: "leg1",
    leg2: "leg2",
  };

  return mp[transactionQuerySortField];
}
