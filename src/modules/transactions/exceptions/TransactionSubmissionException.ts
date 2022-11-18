export enum TransactionSubmissionFailureExceptionText {
  INVALID_WALLET = "INVALID-WALLET",
  UNKNOWN_CRYPTO = "UNKNOWN-CRYPTO",
  UNKNOWN_FIAT = "UNKNOWN-FIAT",
  SLIPPAGE = "SLIPPAGE",
  SANCTIONED_WALLET = "SANCTIONED-WALLET",
  SANCTIONED_TRANSACTION = "SANCTIONED-TRANSACTION",
  WALLET_DOES_NOT_EXIST = "WALLET-DOES-NOT-EXIST",
  UNKNOWN_PAYMENT_METHOD = "UNKNOWN-PAYMENT-METHOD",
  UNKNOWN_PARTNER = "UNKNOWN-PARTNER",
  TRANSACTION_TOO_SMALL = "TRANSACTION-TOO-SMALL",
  TRANSACTION_TOO_LARGE = "TRANSACTION-TOO-LARGE",
  MONTHLY_LIMIT_REACHED = "MONTHLY-LIMIT-REACHED",
  DAILY_LIMIT_REACHED = "DAILY-LIMIT-REACHED",
  WEEKLY_LIMIT_REACHED = "WEEKLY-LIMIT-REACHED",
  UNKNOWN_LIMIT_ERROR = "UNKNOWN-LIMIT-ERROR",
}

export class TransactionSubmissionException extends Error {
  disposition: TransactionSubmissionFailureExceptionText;
  reasonCode: string;
  reasonSummary: string;

  constructor(disposition: TransactionSubmissionFailureExceptionText, reasonCode?: string, reasonSummary?: string) {
    super(disposition);
    this.disposition = disposition;
    this.reasonCode = reasonCode;
    this.reasonSummary = reasonSummary;
  }
}
