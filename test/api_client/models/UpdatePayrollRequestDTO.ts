/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type UpdatePayrollRequestDTO = {
  status?:
    | "CREATED"
    | "INVOICED"
    | "PREPARED"
    | "INVESTIGATION"
    | "FUNDED"
    | "IN_PROGRESS"
    | "RECEIPT"
    | "COMPLETED"
    | "EXPIRED";
  paymentMonoTransactionID?: string;
};
