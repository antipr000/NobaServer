import { Otp } from "../domain/Otp";

export interface IOTPRepo {
  getOTP(emailOrPhone: string, identityType: string, partnerID?: string): Promise<Otp>;
  getAllOTPsForUser(emailOrPhone: string, identityType: string): Promise<Otp[]>;
  saveOTP(
    emailOrPhone: string,
    otp: number,
    identityType: string,
    partnerID?: string,
    expirtyTimeInMs?: number,
  ): Promise<void>;
  saveOTPObject(otp: Otp): Promise<void>;
  deleteOTP(id: string): Promise<void>;
  deleteAllOTPsForUser(emailOrPhone: string, identityType: string, userID?: string): Promise<void>;
  deleteAllExpiredOTPs(): Promise<void>;
}
