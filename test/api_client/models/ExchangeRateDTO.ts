/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type ExchangeRateDTO = {
  /**
   * The currency that is being exchanged from
   */
  numeratorCurrency: string;
  /**
   * The currency that is being exchanged to
   */
  denominatorCurrency: string;
  /**
   * The exchange rate set by the bank, calculated as numerator/denominator
   */
  bankRate: number;
  /**
   * The exchange rate set by Noba, calculated as numerator/denominator. If not set, will default to bankRate.
   */
  nobaRate?: number;
  /**
   * The timestamp at which this exchange rate expires. If not set, will default to 24 hours from now.
   */
  expirationTimestamp?: string;
};
