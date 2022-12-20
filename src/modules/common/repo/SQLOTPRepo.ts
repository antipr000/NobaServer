import { IOTPRepo } from "./OTPRepo";
import { OTP } from "../domain/OTP";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { IdentityType, Prisma } from "@prisma/client";
import { addMinutes } from "date-fns";
import { BadRequestError } from "src/core/exception/CommonAppException";

const EXPIRY_TIME_IN_MINUTES = 15;

@Injectable()
export class SQLOTPRepo implements IOTPRepo {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  async getOTP(otpIdentifier: string, identityType: IdentityType): Promise<OTP> {
    try {
      const result = await this.prisma.otp.findUnique({
        where: {
          uniqueIdentifier: {
            otpIdentifier: otpIdentifier,
            identityType: identityType,
          },
        },
      });
      if (result === undefined || result === null) {
        return null;
      }

      return OTP.createOtp(result);
    } catch (e) {
      return null;
    }
  }

  async saveOTP(otpIdentifier: string, otp: number, identityType: IdentityType): Promise<void> {
    try {
      const otpInputObject: Prisma.OtpCreateInput = {
        otpIdentifier: otpIdentifier,
        otp: otp,
        identityType: identityType,
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        otpExpirationTimestamp: addMinutes(new Date(), EXPIRY_TIME_IN_MINUTES),
      };

      await this.prisma.otp.create({ data: otpInputObject });
    } catch (e) {
      throw new BadRequestError({
        message: `Failed to save otp. Reason: ${e.message}`,
      });
    }
  }

  async deleteOTP(id: string): Promise<void> {
    try {
      await this.prisma.otp.delete({
        where: {
          id: id,
        },
      });
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      this.logger.warn(`Error deleting OTP by ID: ${e}`);
    }
  }

  async deleteAllOTPsForIdentifier(otpIdentifier: string, identityType: IdentityType): Promise<void> {
    try {
      await this.prisma.otp.deleteMany({ where: { otpIdentifier: otpIdentifier, identityType: identityType } });
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      this.logger.warn(`Error deleting OTPs for user: ${e}`);
    }
  }

  async deleteAllExpiredOTPs(): Promise<void> {
    try {
      const date = new Date();
      const result = await this.prisma.otp.deleteMany({ where: { otpExpirationTimestamp: { lt: date } } });
      this.logger.debug(`Deleted ${result.count} OTPs with expiration timestamp < ${date}`);
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      this.logger.warn(`Error deleting OTPs for user: ${e}`);
    }
  }
}
