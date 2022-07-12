/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type PaymentMethodsDTO = {
  cardName?: string;
  cardType?: string;
  imageUri?: string;
  paymentToken: string;
  first6Digits: string;
  last4Digits: string;
};
