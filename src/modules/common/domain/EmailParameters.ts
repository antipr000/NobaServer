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

export interface TransactionInitiatedEmailParameters extends TransactionParameters {}

export interface OrderExecutedEmailParameters extends TransactionParameters {
  transactionHash: string;
  settledTimestamp: Date;
  cryptoAmountExpected: number;
}

export interface OrderFailedEmailParameters extends TransactionParameters {
  failureReason: string;
}
