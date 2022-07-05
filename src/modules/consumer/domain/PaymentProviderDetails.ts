export enum PaymentProviders {
  STRIPE = "Stripe",
  CHECKOUT = "Checkout",
}

export type PaymentProviderDetails = {
  providerID: PaymentProviders;
  providerCustomerID: string;
};
