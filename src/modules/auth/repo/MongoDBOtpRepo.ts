import { Inject, Logger } from "@nestjs/common";
import { IOTPRepo } from "./OTPRepo";
import { Otp, OtpProps } from "../domain/Otp";
import { OtpModel } from "../../../infra/mongodb/models/OtpModel";
import { OtpMapper } from "../mapper/OtpMapper";
import { otpConstants } from "../constants";
import { Injectable, NotFoundException } from "@nestjs/common";
import { convertDBResponseToJsObject } from "../../../../src/infra/mongodb/MongoDBUtils";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";

@Injectable()
export class MongoDBOtpRepo implements IOTPRepo {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly otpMapper: OtpMapper = new OtpMapper();

  async getOTP(emailOrPhone: string, identityType: string): Promise<Otp> {
    const result = await OtpModel.findOne({ emailOrPhone: emailOrPhone, identityType: identityType }).exec();
    if (result === undefined || result === null) {
      throw new NotFoundException(`"${emailOrPhone}" is not registered. Please register!`);
    }
    const otpProps: OtpProps = convertDBResponseToJsObject(result);
    return this.otpMapper.toDomain(otpProps);
  }

  async getAllOTPsForUser(emailOrPhone: string, identityType: string): Promise<Otp[]> {
    const result = await OtpModel.find({ emailOrPhone: emailOrPhone, identityType: identityType }).exec();
    const otpProps: OtpProps[] = convertDBResponseToJsObject(result);
    return otpProps.map(otpResult => this.otpMapper.toDomain(otpResult));
  }

  async saveOTP(emailID: string, otp: number, identityType: string): Promise<void> {
    const expiryTime = new Date(new Date().getTime() + otpConstants.EXPIRY_TIME_IN_MINUTES * 60000);
    const otpInstance = Otp.createOtp({
      emailOrPhone: emailID,
      otp: otp,
      otpExpiryTime: expiryTime.getTime(),
      identityType: identityType,
    });
    try {
      await OtpModel.create(otpInstance.props);
    } catch (e) {
      // Already exists. We should update now
      await OtpModel.findByIdAndUpdate(emailID, otpInstance.props);
    }
  }

  async deleteOTP(id: string): Promise<void> {
    try {
      OtpModel.deleteOne({ _id: id });
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      console.log(e);
    }
  }

  async deleteAllOTPsForUser(emailOrPhone: string, identityType: string): Promise<void> {
    try {
      OtpModel.deleteMany({ emailOrPhone: emailOrPhone, identityType: identityType }).exec();
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      console.log(e);
    }
  }

  async deleteAllExpiredOTPs(): Promise<void> {
    try {
      const date = new Date().getTime();
      const result = await OtpModel.deleteMany({ otpExpiryTime: { $lt: date } }).exec();
      this.logger.debug(`Deleted ${result.deletedCount} OTPs with expiration timestamp < ${date}`);
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      console.log(e);
    }
  }
}
