import { IOTPRepo } from "./OTPRepo";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { Otp, OtpProps } from "../domain/Otp";
import { OtpModel } from "../../../infra/mongodb/models/OtpModel";
import { OtpMapper } from "../mapper/OtpMapper";
import { otpConstants } from "../constants";
import { Injectable, NotFoundException } from "@nestjs/common";
import { convertDBResponseToJsObject } from "../../../../src/infra/mongodb/MongoDBUtils";


@Injectable()
export class MongoDBOtpRepo implements IOTPRepo {

    private readonly otpMapper: OtpMapper = new OtpMapper();

    async getOTP(emailOrPhone: string, identityType: string): Promise<Otp> {
        const result = await OtpModel.findById(emailOrPhone).exec();
        if (result === undefined || result === null) {
            throw new NotFoundException(`"${emailOrPhone}" is not registerd. Please register!`);
        }
        const otpProps: OtpProps = convertDBResponseToJsObject(result);
        return this.otpMapper.toDomain(otpProps);
    }

    async saveOTP(emailID: string, otp: number): Promise<void> {
        const expiryTime = new Date(new Date().getTime() + otpConstants.EXPIRY_TIME_IN_MINUTES * 60000);
        const otpProps: OtpProps = {
            _id: emailID,
            otp: otp,
            otpExpiryTime: expiryTime.getTime()
        };
        try {
            await OtpModel.create(otpProps);
        } catch (e) {
            // Already exists. We should update now
            await OtpModel.findByIdAndUpdate(emailID, otpProps)
        }
    }

}