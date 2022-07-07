/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type AddPaymentMethodDTO = {
  cardName?: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  imageUri?: string;
};
