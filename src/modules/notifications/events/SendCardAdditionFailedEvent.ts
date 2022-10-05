export class SendCardAdditionFailedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly last4Digits: string;

  constructor({ email, firstName, lastName, last4Digits }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.last4Digits = last4Digits;
  }
}
