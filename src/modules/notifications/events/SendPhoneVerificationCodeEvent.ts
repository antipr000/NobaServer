export class SendPhoneVerificationCodeEvent {
  public readonly phone: string;
  public readonly otp: string;
  public readonly name: string;
  public readonly handle: string;
  public readonly locale?: string;

  constructor({ phone, otp, name, handle, locale }) {
    this.phone = phone;
    this.otp = otp;
    this.name = name;
    this.handle = handle;
    this.locale = locale;
  }
}
