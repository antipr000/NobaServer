import { OTP } from "../domain/OTP";

export interface IOTPRepo {
  getOTP(emailOrPhone: string, identityType: string, consumerID?: string): Promise<OTP>;
  getAllOTPsForUser(emailOrPhone: string, identityType: string, consumerID?: string): Promise<OTP[]>;
  saveOTP(
    emailOrPhone: string,
    otp: number,
    identityType: string,
    consumerID?: string,
    expiryTimeInMs?: number,
  ): Promise<void>;
  saveOTPObject(otp: OTP): Promise<void>;
  deleteOTP(id: string): Promise<void>;
  deleteAllOTPsForUser(emailOrPhone: string, identityType: string, consumerID?: string): Promise<void>;
  deleteAllExpiredOTPs(): Promise<void>;
}
