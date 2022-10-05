export class SendOtpEvent {
  public readonly email: string;
  public readonly otp: string;
  public readonly name: string;

  constructor({ email, otp, name }) {
    this.email = email;
    this.otp = otp;
    this.name = name;
  }
}
