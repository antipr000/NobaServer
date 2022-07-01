/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type AddPaymentMethodDTO = {
  paymentMethodType: "Card";
  cardNumber?: string;
  cardExpiryMonth?: number;
  cardExpiryYear?: number;
  cardCVV?: string;
  billingAddress?: string;
  cardHolderName?: string;
};
