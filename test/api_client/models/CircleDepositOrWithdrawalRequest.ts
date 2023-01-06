/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CircleDepositOrWithdrawalRequest = {
  /**
   * ID of the workflow
   */
  workflowID: string;
  /**
   * Amount to debit or credit
   */
  amount: number;
};
