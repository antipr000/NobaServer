export class SendCardAddedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly nobaUserID?: string;

  public readonly cardNetwork: string;
  public readonly last4Digits: string;

  constructor({ email, firstName, lastName, nobaUserID, cardNetwork, last4Digits }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.nobaUserID = nobaUserID;

    this.cardNetwork = cardNetwork;
    this.last4Digits = last4Digits;
  }
}
