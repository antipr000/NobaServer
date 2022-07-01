/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CheckTransactionDTO = {
  status:
    | "ALLOWED"
    | "TRANSACTION_LIMIT_REACHED"
    | "DAILY_LIMIT_REACHED"
    | "WEEKLY_LIMIT_REACHED"
    | "MONTHLY_LIMIT_REACHED"
    | "MAX_LIMIT_REACHED";
};
