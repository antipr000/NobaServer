import { Transaction, TransactionStatus } from "../../../modules/transaction/domain/Transaction";

export type TransactionParameters = {
  transactionID: string;
  transactionTimestamp: Date;
  paymentMethod: string;
  destinationWalletAddress: string;
  last4Digits: string;
  fiatCurrency: string;
  conversionRate: number;
  processingFee: number;
  networkFee: number;
  nobaFee: number;
  totalPrice: number;
  cryptoAmount: number;
  cryptocurrency: string;
  status: TransactionStatus;
};

export interface CryptoFailedNotificationParameters extends TransactionParameters {
  failureReason: string;
}

export type TransactionInitiatedNotificationParameters = TransactionParameters;

export interface TransactionExecutedNotificationParameters extends TransactionParameters {
  transactionHash: string;
  settledTimestamp: Date;
  cryptoAmountExpected: number;
}

export interface TransactionFailedNotificationParameters extends TransactionParameters {
  failureReason: string;
}

export class TransactionNotificationPayloadMapper {
  toTransactionInitiatedNotificationParameters(transaction: Transaction): TransactionInitiatedNotificationParameters {
    return {
      transactionID: transaction.id,
      transactionTimestamp: transaction.updatedTimestamp,
      paymentMethod: "",
      destinationWalletAddress: "",
      last4Digits: "",
      fiatCurrency: transaction.creditCurrency,
      conversionRate: transaction.exchangeRate,
      processingFee: 0,
      networkFee: 0,
      nobaFee: 0,
      totalPrice: transaction.creditAmount,
      cryptoAmount: 0,
      cryptocurrency: "",
      status: transaction.status,
    };
  }

  toTransactionExecutedNotificationParameters(transaction: Transaction): TransactionExecutedNotificationParameters {
    const transactionParams = this.toTransactionInitiatedNotificationParameters(transaction);
    return {
      ...transactionParams,
      transactionHash: transaction.transactionRef,
      settledTimestamp: transaction.updatedTimestamp,
      cryptoAmountExpected: 0,
    };
  }

  toTransactionFailedNotificationParameters(transaction: Transaction): TransactionFailedNotificationParameters {
    const transactionParams = this.toTransactionInitiatedNotificationParameters(transaction);
    return {
      ...transactionParams,
      failureReason: "",
    };
  }
}
