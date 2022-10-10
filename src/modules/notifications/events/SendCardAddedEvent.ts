export class SendCardAddedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly cardNetwork: string;
  public readonly last4Digits: string;
  public readonly partnerId?: string;

  constructor({ email, firstName, lastName, cardNetwork, last4Digits, partnerId }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.cardNetwork = cardNetwork;
    this.last4Digits = last4Digits;
    this.partnerId = partnerId;
  }
}
