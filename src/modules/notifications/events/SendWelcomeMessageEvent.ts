export class SendWelcomeMessageEvent {
  public readonly email: string;
  public readonly firstName?: string;
  public readonly lastName?: string;

  constructor({ email, firstName, lastName }) {
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
  }
}
