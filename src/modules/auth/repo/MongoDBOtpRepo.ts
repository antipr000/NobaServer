import { IOTPRepo } from "./OTPRepo";
import { Otp, OtpProps } from "../domain/Otp";
import { OtpModel } from "../../../infra/mongodb/models/OtpModel";
import { OtpMapper } from "../mapper/OtpMapper";
import { otpConstants } from "../constants";
import { Injectable, NotFoundException } from "@nestjs/common";
import { convertDBResponseToJsObject } from "../../../../src/infra/mongodb/MongoDBUtils";
import { randomUUID } from "crypto";

@Injectable()
export class MongoDBOtpRepo implements IOTPRepo {
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
    const otpProps: OtpProps = {
      _id: randomUUID(),
      emailOrPhone: emailID,
      otp: otp,
      otpExpiryTime: expiryTime.getTime(),
      identityType: identityType,
    };
    try {
      await OtpModel.create(otpProps);
    } catch (e) {
      // Already exists. We should update now
      await OtpModel.findByIdAndUpdate(emailID, otpProps);
    }
  }

  async deleteOTP(id: string): Promise<void> {
    try {
      await OtpModel.deleteOne({_id: id});
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      console.log(e);
    }
  }

  async deleteAllExpiredOTPs(): Promise<void> {
    try {
      const expiredOTPs = await OtpModel.deleteMany({ expiryTime: {$lt: new Date().getTime()}});
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      console.log(e);
    }
  }
}
