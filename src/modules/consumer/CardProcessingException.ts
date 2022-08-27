export enum CardFailureExceptionText {
  NO_CRYPTO = "NO-CRYPTO",
  SOFT_DECLINE = "SOFT-DECLINE",
  DECLINE = "DECLINE",
  ERROR = "ERROR",
}

export class CardProcessingException extends Error {
  disposition: CardFailureExceptionText;
  reasonCode: string;
  reasonSummary: string;

  constructor(disposition: CardFailureExceptionText, reasonCode?: string, reasonSummary?: string) {
    super(disposition);
    this.disposition = disposition;
    this.reasonCode = reasonCode;
    this.reasonSummary = reasonSummary;
  }
}
