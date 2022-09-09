import { IOTPRepo } from "./OTPRepo";
import { Otp, OtpProps } from "../domain/Otp";
import { OtpMapper } from "../mapper/OtpMapper";
import { otpConstants } from "../constants";
import { Inject, Injectable, NotFoundException, Logger } from "@nestjs/common";
import { convertDBResponseToJsObject } from "../../../../src/infra/mongodb/MongoDBUtils";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { consumerIdentityIdentifier } from "../domain/IdentityType";

@Injectable()
export class MongoDBOtpRepo implements IOTPRepo {
  @Inject()
  private readonly dbProvider: DBProvider;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly otpMapper: OtpMapper = new OtpMapper();

  async getOTP(emailOrPhone: string, identityType: string, partnerID?: string): Promise<Otp> {
    const otpModel = await this.dbProvider.getOtpModel();
    const queryParams = {
      emailOrPhone: emailOrPhone,
      identityType: identityType,
    };

    if (identityType === consumerIdentityIdentifier) {
      queryParams["partnerID"] = partnerID;
    }
    const result = await otpModel.findOne(queryParams).exec();
    if (result === undefined || result === null) {
      throw new NotFoundException(`"No OTP found for ${emailOrPhone}"!`);
    }
    const otpProps: OtpProps = convertDBResponseToJsObject(result);
    return this.otpMapper.toDomain(otpProps);
  }

  async getAllOTPsForUser(emailOrPhone: string, identityType: string): Promise<Otp[]> {
    const otpModel = await this.dbProvider.getOtpModel();
    const result = await otpModel.find({ emailOrPhone: emailOrPhone, identityType: identityType }).exec();
    const otpProps: OtpProps[] = convertDBResponseToJsObject(result);
    return otpProps.map(otpResult => this.otpMapper.toDomain(otpResult));
  }

  async saveOTP(
    emailID: string,
    otp: number,
    identityType: string,
    partnerID?: string,
    expiryTimeInMs?: number,
  ): Promise<void> {
    const expiryTime = new Date(new Date().getTime() + (expiryTimeInMs ?? otpConstants.EXPIRY_TIME_IN_MINUTES * 60000));
    let otpInstance;
    if (identityType === consumerIdentityIdentifier) {
      otpInstance = Otp.createOtp({
        emailOrPhone: emailID,
        otp: otp,
        otpExpiryTime: expiryTime.getTime(),
        identityType: identityType,
        partnerID: partnerID,
      });
    } else {
      otpInstance = Otp.createOtp({
        emailOrPhone: emailID,
        otp: otp,
        otpExpiryTime: expiryTime.getTime(),
        identityType: identityType,
      });
    }

    const otpModel = await this.dbProvider.getOtpModel();
    try {
      await otpModel.create(otpInstance.props);
    } catch (e) {
      // Already exists. We should update now
      await otpModel.findByIdAndUpdate(emailID, otpInstance.props);
    }
  }

  async deleteOTP(id: string): Promise<void> {
    try {
      const otpModel = await this.dbProvider.getOtpModel();
      await otpModel.deleteOne({ _id: id });
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      console.log(e);
    }
  }

  async deleteAllOTPsForUser(emailOrPhone: string, identityType: string): Promise<void> {
    try {
      const otpModel = await this.dbProvider.getOtpModel();
      await otpModel.deleteMany({ emailOrPhone: emailOrPhone, identityType: identityType });
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      console.log(e);
    }
  }

  async deleteAllExpiredOTPs(): Promise<void> {
    try {
      const otpModel = await this.dbProvider.getOtpModel();
      const date = new Date().getTime();
      const result = await otpModel.deleteMany({ otpExpiryTime: { $lt: date } });
      this.logger.debug(`Deleted ${result.deletedCount} OTPs with expiration timestamp < ${date}`);
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      console.log(e);
    }
  }
}
