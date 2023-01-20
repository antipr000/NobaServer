export class SendOtpEvent {
  public readonly email: string;
  public readonly otp: string;
  public readonly name: string;
  public readonly locale?: string;

  constructor({ email, otp, name, locale }) {
    this.email = email;
    this.otp = otp;
    this.name = name;
    this.locale = locale;
  }
}
