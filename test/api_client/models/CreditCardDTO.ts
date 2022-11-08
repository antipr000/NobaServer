/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CreditCardDTO = {
  issuer?: string;
  network: string;
  bin: string;
  type: string;
  supported: string;
  digits: number;
  cvvDigits: number;
  mask?: string;
};
