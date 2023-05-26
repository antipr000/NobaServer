import { Inject, Injectable } from "@nestjs/common";
import { IdentityType } from "@prisma/client";
import { IOTPRepo } from "./repo/otp.repo";
import { Utils } from "../../core/utils/Utils";
import { isAfter } from "date-fns";

@Injectable()
export class OTPService {
  @Inject("OTPRepo")
  private readonly otpRepo: IOTPRepo;

  async checkIfOTPIsValidAndCleanup(otpIdentifier: string, identityType: IdentityType, otp: number): Promise<boolean> {
    const otpRecord = await this.otpRepo.getOTP(Utils.stripNonPhoneChars(otpIdentifier), identityType);
    if (!otpRecord || otpRecord.props.otp !== otp || isAfter(new Date(), otpRecord.props.otpExpirationTimestamp)) {
      return false;
    }

    await this.otpRepo.deleteOTP(otpRecord.props.id);
    return true;
  }

  async saveOTP(otpIdentifier: string, identityType: IdentityType, otp: number): Promise<void> {
    // Clean existing otps for identifier if any
    await this.otpRepo.deleteAllOTPsForIdentifier(Utils.stripNonPhoneChars(otpIdentifier), identityType);
    await this.otpRepo.saveOTP(Utils.stripNonPhoneChars(otpIdentifier), otp, identityType);
  }
}
