import { IOTPRepo } from "./OTPRepo";
import { OTP, OTPProps } from "../domain/OTP";
import { OTPMapper } from "../mapper/OtpMapper";
import { Inject, Injectable, NotFoundException, Logger } from "@nestjs/common";
import { convertDBResponseToJsObject } from "../../../infra/mongodb/MongoDBUtils";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { consumerIdentityIdentifier } from "../domain/IdentityType";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { Prisma } from "@prisma/client";
import { Utils } from "../../../core/utils/Utils";

@Injectable()
export class SQLOTPRepo implements IOTPRepo {
  @Inject()
  private readonly prisma: PrismaService;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly otpMapper: OTPMapper = new OTPMapper();

  async getOTP(emailOrPhone: string, identityType: string, consumerID?: string): Promise<OTP> {
    const queryParams = {
      emailOrPhone: Utils.stripSpaces(emailOrPhone),
      identityType: OTP.getIdentityTypeFromString(identityType),
    };

    if (consumerID) {
      queryParams["consumerID"] = consumerID;
    }

    const query = Prisma.validator<Prisma.OtpWhereInput>()({ ...queryParams });
    const result = await this.prisma.otp.findFirst({ where: query });
    if (result === undefined || result === null) {
      return null;
    }

    const otpProps: OTPProps = convertDBResponseToJsObject(result);
    return this.otpMapper.toDomain(otpProps);
  }

  async getAllOTPsForUser(emailOrPhone: string, identityType: string, consumerID?: string): Promise<OTP[]> {
    let queryParams;
    if (consumerID) {
      queryParams = { consumerID: consumerID };
    } else {
      queryParams = { emailOrPhone: Utils.stripSpaces(emailOrPhone), identityType: identityType };
    }

    const query = Prisma.validator<Prisma.OtpWhereInput>()({ ...queryParams });
    const result = await this.prisma.otp.findMany({ where: query });
    const otpProps: OTPProps[] = convertDBResponseToJsObject(result);
    return otpProps.map(otpResult => this.otpMapper.toDomain(otpResult));
  }

  async saveOTP(otpIdentifier: string, otp: number, identityTypeStr: string, consumerID?: string): Promise<void> {
    const identityType = OTP.getIdentityTypeFromString(identityTypeStr);
    let otpInstance: OTP;
    if (identityType === consumerIdentityIdentifier) {
      otpInstance = OTP.createOtp({
        emailOrPhone: Utils.stripSpaces(otpIdentifier),
        otp: otp,
        identityType: identityType,
        consumerID: consumerID,
      });
    } else {
      otpInstance = OTP.createOtp({
        emailOrPhone: Utils.stripSpaces(otpIdentifier),
        otp: otp,
        identityType: identityType,
      });
    }

    await this.saveOTPObject(otpInstance);
  }

  async saveOTPObject(otp: OTP): Promise<void> {
    const saveObj: Prisma.OtpUncheckedCreateInput = { ...otp.props };
    try {
      await this.prisma.otp.create({ data: saveObj });
    } catch (e) {
      // Already exists, which should never happen since we delete OTPs when generating new
      this.logger.warn(`Error while creating new OTP in db. Error: ${e}`);
      throw new Error("Error saving OTP");
    }
  }

  async deleteOTP(id: string): Promise<void> {
    try {
      await this.prisma.otp.delete({ where: { id: id } });
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      this.logger.warn(`Error deleting OTP by ID: ${e}`);
    }
  }

  async deleteAllOTPsForUser(emailOrPhone: string, identityTypeStr: string, consumerID?: string): Promise<void> {
    try {
      const identityType = OTP.getIdentityTypeFromString(identityTypeStr);
      if (consumerID) {
        await this.prisma.otp.deleteMany({ where: { consumerID: consumerID, identityType: identityType } });
      }
      // To be full proof, always delete by emailOrPhone passed too, in case there are multiple users with same email or phone
      await this.prisma.otp.deleteMany({ where: { emailOrPhone: emailOrPhone, identityType: identityType } });
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
