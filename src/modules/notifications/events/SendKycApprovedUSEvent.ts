export class SendKycApprovedUSEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly nobaUserID?: string;
  public readonly partnerUserID?: string;
  public readonly partnerID?: string;

  constructor({ email, firstName, lastName, nobaUserID, partnerUserID, partnerID }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.nobaUserID = nobaUserID;
    this.partnerUserID = partnerUserID;
    this.partnerID = partnerID;
  }
}
