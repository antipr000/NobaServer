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
  institutionID: string;
  availableBalance: string;
  currencyCode: string;
  mask: string;
  name: string;
  accountType: BankAccountType;
  accountNumber: string;
  achRoutingNumber: string;
  wireRoutingNumber: string;
};

export enum BankAccountType {
  SAVINGS = "Savings",
  CHECKING = "Checking",
  OTHERS = "Others",
}

export type CreateProcessorTokenRequest = {
  accountID: string;
  accessToken: string;
  tokenProcessor: TokenProcessor;
};

export enum TokenProcessor {
  CHECKOUT = "Checkout",
}
