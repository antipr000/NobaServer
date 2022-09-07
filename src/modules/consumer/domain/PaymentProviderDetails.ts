export enum PaymentProviders {
  CHECKOUT = "Checkout",
}

export type PaymentProviderDetails = {
  providerID: PaymentProviders;
  providerCustomerID: string;
};
