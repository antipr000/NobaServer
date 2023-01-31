export class SendEmployerRequestEvent {
  public readonly email: string;
  public readonly locale?: string;

  constructor({ email, locale }) {
    this.email = email;
    this.locale = locale;
  }
}
