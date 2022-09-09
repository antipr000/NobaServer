export enum TransactionSubmissionFailureExceptionText {
  INVALID_WALLET = "INVALID-WALLET",
  UNKNOWN_CRYPTO = "UNKNOWN-CRYPTO",
  UNKNOWN_FIAT = "UNKNOWN-FIAT",
  SLIPPAGE = "SLIPPAGE",
  SANCTIONED_WALLET = "SANCTIONED-WALLET",
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
