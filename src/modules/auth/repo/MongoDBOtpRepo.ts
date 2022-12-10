import { IOTPRepo } from "./OTPRepo";
import { Otp, OtpProps } from "../domain/Otp";
import { OtpMapper } from "../mapper/OtpMapper";
import { Inject, Injectable, NotFoundException, Logger } from "@nestjs/common";
import { convertDBResponseToJsObject } from "../../../../src/infra/mongodb/MongoDBUtils";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { consumerIdentityIdentifier } from "../domain/IdentityType";
import { Utils } from "../../../core/utils/Utils";

@Injectable()
export class MongoDBOtpRepo implements IOTPRepo {
  @Inject()
  private readonly dbProvider: DBProvider;

  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  private readonly otpMapper: OtpMapper = new OtpMapper();

  async getOTP(emailOrPhone: string, identityType: string, consumerID?: string): Promise<Otp> {
    const otpModel = await this.dbProvider.getOtpModel();
    const queryParams = {
      emailOrPhone: Utils.stripSpaces(emailOrPhone),
      identityType: identityType,
    };

    if (consumerID) {
      queryParams["consumerID"] = consumerID;
    }

    const result = await otpModel.findOne(queryParams).exec();
    if (result === undefined || result === null) {
      throw new NotFoundException(`No OTP found for ${emailOrPhone}`);
    }
    const otpProps: OtpProps = convertDBResponseToJsObject(result);
    return this.otpMapper.toDomain(otpProps);
  }

  async getAllOTPsForUser(emailOrPhone: string, identityType: string, consumerID?: string): Promise<Otp[]> {
    const otpModel = await this.dbProvider.getOtpModel();
    let result;
    if (consumerID) {
      result = await otpModel.find({ consumerID: consumerID }).exec();
    } else {
      result = await otpModel
        .find({ emailOrPhone: Utils.stripSpaces(emailOrPhone), identityType: identityType })
        .exec();
    }
    const otpProps: OtpProps[] = convertDBResponseToJsObject(result);
    return otpProps.map(otpResult => this.otpMapper.toDomain(otpResult));
  }

  async saveOTP(
    otpIdentifier: string,
    otp: number,
    identityType: string,
    consumerID?: string,
    expiryTimeInMs?: number,
  ): Promise<void> {
    let otpInstance;
    if (identityType === consumerIdentityIdentifier) {
      otpInstance = Otp.createOtp({
        emailOrPhone: Utils.stripSpaces(otpIdentifier),
        otp: otp,
        identityType: identityType,
        otpExpiryTime: expiryTimeInMs,
        consumerID: consumerID,
      });
    } else {
      otpInstance = Otp.createOtp({
        emailOrPhone: Utils.stripSpaces(otpIdentifier),
        otp: otp,
        otpExpiryTime: expiryTimeInMs,
        identityType: identityType,
      });
    }

    await this.saveOTPObject(otpInstance);
  }

  async saveOTPObject(otp: Otp): Promise<void> {
    const otpModel = await this.dbProvider.getOtpModel();
    try {
      await otpModel.create(otp.props);
    } catch (e) {
      // Already exists, which should never happen since we delete OTPs when generating new
      this.logger.warn(`Error while creating new OTP in db. Error: ${e}`);
      throw new Error("Error saving OTP");
    }
  }

  async deleteOTP(id: string): Promise<void> {
    try {
      const otpModel = await this.dbProvider.getOtpModel();
      await otpModel.deleteOne({ _id: id });
    } catch (e) {
      // If unable to find, it's unusable anyway. Still log as this could be a bigger issue.
      this.logger.warn(`Error deleting OTP by ID: ${e}`);
    }
  }

  async deleteAllOTPsForUser(emailOrPhone: string, identityType: string, consumerID?: string): Promise<void> {
    try {
      const otpModel = await this.dbProvider.getOtpModel();
      if (consumerID) {
        await otpModel.deleteMany({ identityType: identityType, consumerID: consumerID });
      }
      // To be full proof, always delete by emailOrPhone passed too, in case there are multiple users with same email or phone
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
