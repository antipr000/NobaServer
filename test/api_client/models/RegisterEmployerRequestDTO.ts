/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type RegisterEmployerRequestDTO = {
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  maxAllocationPercent?: number;
  leadDays?: number;
  payrollAccountNumber?: string;
  payrollDates?: Array<string>;
};
