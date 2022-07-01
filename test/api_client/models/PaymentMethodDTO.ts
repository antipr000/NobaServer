/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type PaymentMethodDTO = {
  paymentMethodID: string;
  paymentMethodType: "Card";
  cardNumber?: string;
  billingAddress?: string;
  cardHolderName?: string;
};
