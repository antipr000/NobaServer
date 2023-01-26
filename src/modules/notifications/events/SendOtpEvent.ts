export class SendOtpEvent {
  public readonly email: string;
  public readonly phone: string;
  public readonly otp: string;
  public readonly name: string;
  public readonly handle: string;
  public readonly locale?: string;

  constructor({ email, phone, otp, name, handle, locale }) {
    this.email = email;
    this.phone = phone;
    this.otp = otp;
    this.name = name;
    this.handle = handle;
    this.locale = locale;
  }
}
