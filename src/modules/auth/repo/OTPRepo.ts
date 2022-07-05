import { Otp } from "../domain/Otp";

export interface IOTPRepo {
  getOTP(emailID: string, identityType: string, partnerID?: string): Promise<Otp>;
  getAllOTPsForUser(emailOrPhone: string, identityType: string): Promise<Otp[]>;
  saveOTP(emailID: string, otp: number, identityType: string, partnerID?: string): Promise<void>;
  deleteOTP(id: string): Promise<void>;
  deleteAllOTPsForUser(emailOrPhone: string, identityType: string): Promise<void>;
  deleteAllExpiredOTPs(): Promise<void>;
}
