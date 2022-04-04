import { IOTPRepo } from "./OTPRepo";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { Otp, OtpProps } from "../domain/Otp";
import { OtpModel } from "../../../infra/mongodb/models/OtpModel";
import { OtpMapper } from "../mapper/OtpMapper";
import { otpConstants } from "../constants";



export class MongoDBOtpRepo implements IOTPRepo {

    private readonly otpMapper: OtpMapper = new OtpMapper();

    constructor(private readonly dbProvider: DBProvider) {}

    async getOTP(emailID: string): Promise<Otp> {
        const result: OtpProps = await OtpModel.findById(emailID).exec()
        return this.otpMapper.toDomain(result);
    }

    async saveOTP(emailID: string, otp: number): Promise<void> {
        const expiryTime = new Date(new Date().getTime() + otpConstants.EXPIRY_TIME_IN_MINUTES * 60000);
        const otpProps: OtpProps = {
            _id: emailID,
            otp: otp,
            otpExpiryTime: expiryTime.getTime()
        };
        try{
            await OtpModel.create(otpProps);
        }catch(e) {
            // Already exists. We should update now
            await OtpModel.findByIdAndUpdate(emailID, otpProps)
        }
    }
    
}