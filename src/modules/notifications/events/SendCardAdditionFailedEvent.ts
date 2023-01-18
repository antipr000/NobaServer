export class SendCardAdditionFailedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly nobaUserID?: string;
  public readonly locale?: string;

  public readonly last4Digits: string;

  constructor({ email, firstName, lastName, nobaUserID, locale, last4Digits }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.nobaUserID = nobaUserID;
    this.locale = locale;
    this.last4Digits = last4Digits;
  }
}
