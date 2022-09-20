/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type TransactionAmountsDTO = {
  /**
   * Fiat amount in USD
   */
  baseAmount: number;
  /**
   * Fiat amount in currency represented by 'fiatCurrency' property
   */
  fiatAmount: number;
  /**
   * Fiat currency used to purchase crypto
   */
  fiatCurrency: string;
  /**
   * Amount of crypto initially expected (see 'cryptoAmountSettled' for final confirmed amount)
   */
  cryptoQuantityExpected: number;
  /**
   * Amount of crypto purchased and settled on the blockchain
   */
  cryptoAmountSettled: number;
  /**
   * Cryptocurrency purchased in this transaction
   */
  cryptocurrency: string;
  /**
   * Payment processing fee for the transaction
   */
  processingFee: number;
  /**
   * Network / gas fee required to settle the transaction on chain
   */
  networkFee: number;
  /**
   * Noba service fee for the transaction
   */
  nobaFee: number;
  /**
   * Amount paid inclusive of fees
   */
  totalFiatPrice: number;
  /**
   * Conversion rate used between the 'fiatCurrency' and 'cryptocurrency'
   */
  conversionRate: number;
};
