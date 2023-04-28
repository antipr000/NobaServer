/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type EmployerDTO = {
  employerID: string;
  employerName: string;
  employerLogoURI: string;
  leadDays: number;
  employerReferralID: string;
  locale: string;
  payrollDates: Array<string>;
  nextPayrollDate: string;
  maxAllocationPercent?: number;
};
