export type TransactionInformation = {
  transactionID: string;
  amount?: number;
  currencyCode?: string;
  first6DigitsOfCard?: number;
  last4DigitsOfCard?: number;
  cardID?: string;
  cryptoCurrencyCode?: string;
  walletAddress?: string;
};
