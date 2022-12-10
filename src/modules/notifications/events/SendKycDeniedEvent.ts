export class SendKycDeniedEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly nobaUserID?: string;

  constructor({ email, firstName, lastName, nobaUserID }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.nobaUserID = nobaUserID;
  }
}
