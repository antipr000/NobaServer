export type MonoClientCollectionLinkRequest = {
  transactionID: string;
  amount: number;
  currency: MonoCurrency;
  consumerEmail: string;
  consumerPhone: string;
  consumerName: string;
};

export enum MonoCurrency {
  COP = "COP",
}

export type MonoClientCollectionLinkResponse = {
  collectionLink: string;
  collectionLinkID: string;
};
