export class SendOtpEvent {
  public readonly email: string;
  public readonly otp: string;
  public readonly name: string;
  public readonly partnerId?: string;

  constructor({ email, otp, name, partnerId }) {
    this.email = email;
    this.otp = otp;
    this.name = name;
    this.partnerId = partnerId;
  }
}
