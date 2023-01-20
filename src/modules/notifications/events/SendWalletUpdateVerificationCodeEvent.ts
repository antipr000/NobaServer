export class SendWalletUpdateVerificationCodeEvent {
  public readonly email: string;
  public readonly otp: string;
  public readonly name?: string;
  public readonly nobaUserID?: string;
  public readonly locale?: string;

  public readonly walletAddress: string;

  constructor({ email, otp, name, nobaUserID, walletAddress, locale }) {
    this.email = email;
    this.otp = otp;
    this.name = name;
    this.nobaUserID = nobaUserID;
    this.locale = locale;
    this.walletAddress = walletAddress;
  }
}
