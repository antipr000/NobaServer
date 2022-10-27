export type GenerateLinkTokenRequest = {
  userID: string;
};

export type ExchangeForAccessTokenRequest = {
  publicToken: string;
};

export type RetrieveAccountDataRequest = {
  accessToken: string;
};

export type RetrieveAccountDataResponse = {
  itemID: string;
  accountID: string;
  availableBalance: string;
  currencyCode: string;
  mask: string;
  name: string;
  subtype: string; // Should only ever be "checking"
  accountNumber: string;
  achRoutingNumber: string;
  wireRoutingNumber: string;
};

export type CreateProcessorTokenRequest = {
  accountID: string;
  accessToken: string;
  tokenProcessor: TokenProcessor;
};

export enum TokenProcessor {
  CHECKOUT = "Checkout",
}
