/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type EmployerDTO = {
  employerName: string;
  employerLogoURI: string;
  leadDays: number;
  employerReferralID: string;
  payrollDates: Array<string>;
  nextPayrollDate: string;
  maxAllocationPercent?: number;
};
