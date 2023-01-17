import { TransactionStatus } from "../../../modules/transaction/domain/Transaction";

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
