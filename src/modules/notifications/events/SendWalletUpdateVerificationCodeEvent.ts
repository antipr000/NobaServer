export class SendWalletUpdateVerificationCodeEvent {
  public readonly email: string;
  public readonly otp: string;
  public readonly name?: string;
  public readonly walletAddress: string;
  public readonly partnerId?: string;

  constructor({ email, otp, name, walletAddress, partnerId }) {
    this.email = email;
    this.otp = otp;
    this.name = name;
    this.walletAddress = walletAddress;
    this.partnerId = partnerId;
  }
}
