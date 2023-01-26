/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SupportedBanksDTO = {
  /**
   * Returns the bank code.
   */
  code: string;
  /**
   * Indicates the format for resource's ID
   */
  id: string;
  /**
   * Returns the bank name.
   */
  name: string;
  /**
   * It contains a list of supported account types by a bank
   */
  supported_account_types: Array<string>;
};
