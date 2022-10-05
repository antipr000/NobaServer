export class SendWalletUpdateVerificationCodeEvent {
  public readonly email: string;
  public readonly otp: string;
  public readonly name?: string;
  public readonly walletAddress: string;

  constructor({ email, otp, name, walletAddress }) {
    this.email = email;
    this.otp = otp;
    this.name = name;
    this.walletAddress = walletAddress;
  }
}
