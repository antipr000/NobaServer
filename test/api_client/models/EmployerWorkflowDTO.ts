/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type EmployerWorkflowDTO = {
  employerID: string;
  employerName: string;
  employerLogoURI: string;
  locale: string;
  leadDays: number;
  employerReferralID: string;
  payrollDates: Array<string>;
  nextPayrollDate: string;
  maxAllocationPercent?: number;
};
