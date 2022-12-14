import { IdentityType } from "@prisma/client";
import { OTP } from "../domain/OTP";

export interface IOTPRepo {
  getOTP(id: string, identityType: IdentityType): Promise<OTP>;
  saveOTP(otpIdentifier: string, otp: number, identityType: IdentityType): Promise<void>;
  deleteOTP(otpIdentifier: string, identityType: IdentityType): Promise<void>;
  deleteAllOTPsForIdentifier(otpIdentifier: string, identityType: IdentityType): Promise<void>;
  deleteAllExpiredOTPs(): Promise<void>;
}
