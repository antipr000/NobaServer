/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SendNotificationRequestDTO = {
  transactionID?: string;
  payrollID?: string;
  payrollStatus?:
    | "CREATED"
    | "INVOICED"
    | "PREPARED"
    | "INVESTIGATION"
    | "FUNDED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "EXPIRED";
};
