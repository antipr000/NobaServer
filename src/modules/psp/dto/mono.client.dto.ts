export type CollectionLinkRequest = {
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
