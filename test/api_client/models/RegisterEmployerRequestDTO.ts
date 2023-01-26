/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type RegisterEmployerRequestDTO = {
  name: string;
  logoURI: string;
  referralID: string;
  bubbleID: string;
  leadDays?: number;
  payrollDays?: Array<string>;
};
