export type GenerateLinkTokenRequest = {
  userID: string;
};

export type ExchangeForAccessTokenRequest = {
  publicToken: string;
};

export type RetrieveAuthDataRequest = {
  accessToken: string;
};

export type RetrieveAuthDataResponse = {
  itemID: string;
  accountID: string;
};

export type CreateProcessorTokenRequest = {
  accountID: string;
  accessToken: string;
  tokenProcessor: TokenProcessor;
};

export enum TokenProcessor {
  CHECKOUT = "Checkout",
}
