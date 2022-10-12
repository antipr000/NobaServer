export class SendWalletUpdateVerificationCodeEvent {
  public readonly email: string;
  public readonly otp: string;
  public readonly name?: string;
  public readonly nobaUserID?: string;
  public readonly partnerUserID?: string;
  public readonly walletAddress: string;
  public readonly partnerID?: string;

  constructor({ email, otp, name, nobaUserID, partnerUserID, walletAddress, partnerID }) {
    this.email = email;
    this.otp = otp;
    this.name = name;
    this.nobaUserID = nobaUserID;
    this.partnerUserID = partnerUserID;
    this.walletAddress = walletAddress;
    this.partnerID = partnerID;
  }
}
