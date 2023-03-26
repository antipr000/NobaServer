/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type PayrollDTO = {
  payrollID: string;
  payrollDate: string;
  reference: string;
  completedTimestamp?: string;
  status:
    | "CREATED"
    | "INVOICED"
    | "PREPARED"
    | "INVESTIGATION"
    | "FUNDED"
    | "IN_PROGRESS"
    | "RECEIPT"
    | "COMPLETED"
    | "EXPIRED";
  payrollISODate: string;
  totalDebitAmount?: number;
  totalCreditAmount?: number;
  exchangeRate?: number;
  debitCurrency?: string;
  creditCurrency?: string;
  disbursements?: Array<string>;
};
