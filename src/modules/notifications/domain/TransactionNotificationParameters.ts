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

export interface OrderExecutedNotificationParameters extends TransactionParameters {
  transactionHash: string;
  settledTimestamp: Date;
  cryptoAmountExpected: number;
}

export interface OrderFailedNotificationParameters extends TransactionParameters {
  failureReason: string;
}

export class TransactionNotificationPayloadParamsMapper {
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

  toOrderExecutedNotificationParameters(transaction: Transaction): OrderExecutedNotificationParameters {
    const transactionParams = this.toTransactionInitiatedNotificationParameters(transaction);
    return {
      ...transactionParams,
      transactionHash: transaction.transactionRef,
      settledTimestamp: transaction.updatedTimestamp,
      cryptoAmountExpected: 0,
    };
  }

  toOrderFailedNotificationParameters(transaction: Transaction): OrderFailedNotificationParameters {
    const transactionParams = this.toTransactionInitiatedNotificationParameters(transaction);
    return {
      ...transactionParams,
      failureReason: "",
    };
  }
}
