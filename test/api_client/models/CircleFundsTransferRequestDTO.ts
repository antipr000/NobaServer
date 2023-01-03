/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CircleFundsTransferRequestDTO = {
  /**
   * ID of the workflow
   */
  workflowID: string;
  /**
   * Amount to debit or credit
   */
  amount: number;
  /**
   * ID of the wallet to transfer funds from
   */
  sourceWalletID: string;
  /**
   * ID of the wallet to transfer funds to
   */
  destinationWalletID: string;
};
