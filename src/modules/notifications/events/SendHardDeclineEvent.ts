export class SendHardDeclineEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly nobaUserID?: string;
  public readonly sessionID: string;
  public readonly transactionID: string;
  public readonly paymentToken: string;
  public readonly processor: string;
  public readonly responseCode: string;
  public readonly responseSummary: string;
  public readonly locale?: string;

  constructor({
    email,
    firstName,
    lastName,
    nobaUserID,
    sessionID,
    transactionID,
    paymentToken,
    processor,
    responseCode,
    responseSummary,
    locale,
  }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.nobaUserID = nobaUserID;
    this.sessionID = sessionID;
    this.transactionID = transactionID;
    this.paymentToken = paymentToken;
    this.processor = processor;
    this.responseCode = responseCode;
    this.responseSummary = responseSummary;
    this.locale = locale;
  }
}
