export type PaymentMethods = {
  cardName?: string;
  cardType?: string;
  first6Digits: number;
  last4Digits: number;
  imageUri: string;
  paymentToken: string;
  paymentProviderID: string;
};
