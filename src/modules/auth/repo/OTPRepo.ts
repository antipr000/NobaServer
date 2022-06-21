import { Otp } from "../domain/Otp";

export interface IOTPRepo {
  getOTP(emailID: string, identityType: string): Promise<Otp>;
  saveOTP(emailID: string, otp: number, identityType: string): Promise<void>;
  useOTP(id: string): Promise<void>;
}
