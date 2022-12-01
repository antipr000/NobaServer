export enum TransactionAllowedStatus {
  ALLOWED = "ALLOWED",
  TRANSACTION_TOO_SMALL = "TRANSACTION_TOO_SMALL",
  TRANSACTION_TOO_LARGE = "TRANSACTION_TOO_LARGE",
  TRANSACTION_LIMIT_REACHED = "TRANSACTION_LIMIT_REACHED",
  DAILY_LIMIT_REACHED = "DAILY_LIMIT_REACHED",
  WEEKLY_LIMIT_REACHED = "WEEKLY_LIMIT_REACHED",
  MONTHLY_LIMIT_REACHED = "MONTHLY_LIMIT_REACHED",
  MAX_LIMIT_REACHED = "MAX_LIMIT_REACHED",
  UNSETTLED_EXPOSURE_LIMIT_REACHED = "UNSETTLED_EXPOSURE_LIMIT_REACHED",
}
