/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type AddressDTO = {
  streetLine1: string;
  streetLine2?: string;
  countryCode: string;
  city: string;
  /**
   * state code in ISO 3166-2
   */
  regionCode: string;
  postalCode: string;
};
