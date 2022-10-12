export class SendOtpEvent {
  public readonly email: string;
  public readonly otp: string;
  public readonly name: string;
  public readonly partnerID?: string;

  constructor({ email, otp, name, partnerID }) {
    this.email = email;
    this.otp = otp;
    this.name = name;
    this.partnerID = partnerID;
  }
}
