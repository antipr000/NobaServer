export class SendEmployerRequestEvent {
  public readonly email: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly locale?: string;

  constructor({ email, firstName, lastName, locale }) {
    this.email = email;
    this.locale = locale;
    this.firstName = firstName;
    this.lastName = lastName;
  }
}
