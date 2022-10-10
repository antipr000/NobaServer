export type TransactionParameters = {
  transactionID: string;
  transactionTimestamp: Date;
  paymentMethod: string;
  last4Digits: string;
  currencyCode: string;
  conversionRate: number;
  processingFee: number;
  networkFee: number;
  nobaFee: number;
  totalPrice: number;
  cryptoAmount: number;
  cryptoCurrency: string;
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
