import { Otp } from "../domain/Otp";

export interface IOTPRepo {
  getOTP(emailOrPhone: string, identityType: string, consumerID?: string): Promise<Otp>;
  getAllOTPsForUser(emailOrPhone: string, identityType: string, consumerID?: string): Promise<Otp[]>;
  saveOTP(
    emailOrPhone: string,
    otp: number,
    identityType: string,
    consumerID?: string,
    expiryTimeInMs?: number,
  ): Promise<void>;
  saveOTPObject(otp: Otp): Promise<void>;
  deleteOTP(id: string): Promise<void>;
  deleteAllOTPsForUser(emailOrPhone: string, identityType: string, consumerID?: string): Promise<void>;
  deleteAllExpiredOTPs(): Promise<void>;
}
