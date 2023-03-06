/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type PayrollDTO = {
  id: string;
  employerID: string;
  reference: string;
  payrollDate: string;
  completedTimestamp?: string;
  totalDebitAmount?: number;
  totalCreditAmount?: number;
  exchangeRate?: number;
  debitCurrency?: string;
  creditCurrency?: string;
  status: "CREATED" | "INVOICED" | "INVESTIGATION" | "FUNDED" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED";
};
