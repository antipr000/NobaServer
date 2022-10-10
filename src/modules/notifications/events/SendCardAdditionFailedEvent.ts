export class SendCardAdditionFailedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly last4Digits: string;
  public readonly partnerId?: string;

  constructor({ email, firstName, lastName, last4Digits, partnerId }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.last4Digits = last4Digits;
    this.partnerId = partnerId;
  }
}
