/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type CheckTransactionDTO = {
  status:
    | "ALLOWED"
    | "TRANSACTION_TOO_SMALL"
    | "TRANSACTION_TOO_LARGE"
    | "TRANSACTION_LIMIT_REACHED"
    | "DAILY_LIMIT_REACHED"
    | "WEEKLY_LIMIT_REACHED"
    | "MONTHLY_LIMIT_REACHED"
    | "MAX_LIMIT_REACHED";
  rangeMin: number;
  rangeMax: number;
};
