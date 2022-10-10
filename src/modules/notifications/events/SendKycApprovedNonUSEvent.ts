export class SendKycApprovedNonUSEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;
  public readonly partnerId?: string;

  constructor({ email, firstName, lastName, partnerId }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.partnerId = partnerId;
  }
}
