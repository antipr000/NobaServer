export class SendCardAddedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly nobaUserID?: string;
  public readonly partnerUserID?: string;
  public readonly cardNetwork: string;
  public readonly last4Digits: string;
  public readonly partnerID?: string;

  constructor({ email, firstName, lastName, nobaUserID, partnerUserID, cardNetwork, last4Digits, partnerID }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.nobaUserID = nobaUserID;
    this.partnerUserID = partnerUserID;
    this.cardNetwork = cardNetwork;
    this.last4Digits = last4Digits;
    this.partnerID = partnerID;
  }
}
