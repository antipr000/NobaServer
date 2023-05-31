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
    const otpStrippedRecord = Utils.isEmail(otpIdentifier)
      ? Utils.stripSpaces(otpIdentifier)
      : Utils.stripNonPhoneChars(otpIdentifier);
    const otpRecord = await this.otpRepo.getOTP(otpStrippedRecord, identityType);
    if (!otpRecord || otpRecord.props.otp !== otp || isAfter(new Date(), otpRecord.props.otpExpirationTimestamp)) {
      return false;
    }

    await this.otpRepo.deleteOTP(otpRecord.props.id);
    return true;
  }

  async saveOTP(otpIdentifier: string, identityType: IdentityType, otp: number): Promise<void> {
    const otpRecord = Utils.isEmail(otpIdentifier)
      ? Utils.stripSpaces(otpIdentifier)
      : Utils.stripNonPhoneChars(otpIdentifier);
    await this.otpRepo.deleteAllOTPsForIdentifier(otpRecord, identityType);
    await this.otpRepo.saveOTP(otpRecord, otp, identityType);
  }
}
