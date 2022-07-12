export type TransactionInformation = {
  transactionID: string;
  amount?: number;
  currencyCode?: string;
  first6DigitsOfCard?: string;
  last4DigitsOfCard?: string;
  cardID?: string;
  cryptoCurrencyCode?: string;
  walletAddress?: string;
};
