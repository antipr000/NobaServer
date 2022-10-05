export class SendOtpEvent {
  public email: string;
  public otp: string;
  public name: string;

  constructor({ email, otp, name }) {
    this.email = email;
    this.otp = otp;
    this.name = name;
  }
}
