/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type ExchangeRateDTO = {
  /**
   * currency that the exchange rate is being calculated from
   */
  numeratorCurrency: "USD" | "COP";
  /**
   * currency that the exchange rate is being calculated to
   */
  denominatorCurrency: "USD" | "COP";
  /**
   * actual exchange rate between the two currencies
   */
  exchangeRate: string;
};
