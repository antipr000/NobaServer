/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type PayrollDisbursementDTO = {
  id: string;
  employeeID: string;
  payrollID: string;
  transactionID?: string;
  debitAmount: number;
};
