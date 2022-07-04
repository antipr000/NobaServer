/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type AddPaymentMethodDTO = {
  cardName?: string;
  cardType: string;
  first6Digits: number;
  last4Digits: number;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
  imageUri?: string;
};
