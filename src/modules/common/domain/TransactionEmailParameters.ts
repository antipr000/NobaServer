export type TransactionEmailParameters = {
  transactionID: string;
  paymentMethod: string;
  last4Digits: string;
  currencyCode: string;
  subtotalPrice: number;
  processingFee: number;
  networkFee: number;
  totalPrice: number;
  cryptoAmount: number;
  cryptoCurrency: string;
};
