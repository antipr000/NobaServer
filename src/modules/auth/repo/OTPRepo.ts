import { Otp, OtpProps } from "../domain/Otp";
import { OtpMapper } from "../mapper/OtpMapper";
import { otpConstants } from "../constants";

export interface IOTPRepo {
    getOTP(emailID: string): Promise<Otp>;
    saveOTP(emailID: string, otp: number): Promise<void>;
}

// TODO: Check & remove this as it might not be actually required. 
export class OTPRepo implements IOTPRepo {

    private readonly emailToOTPMap; //TODO use redis or store in MongoDB? 
    private readonly otpMapper: OtpMapper;

    constructor() {
        this.emailToOTPMap = {};
        this.otpMapper = new OtpMapper();
    }

    async getOTP(emailID: string): Promise<Otp> {
        return this.otpMapper.toDomain(this.emailToOTPMap[emailID]);
    }

    async saveOTP(emailID: string, otp: number): Promise<void> {
        const expiryTime = new Date(new Date().getTime() + otpConstants.EXPIRY_TIME_IN_MINUTES * 60000);
        const otpProps: OtpProps = {
            _id: emailID,
            otp: otp,
            otpExpiryTime: expiryTime.getTime()
        };
        this.emailToOTPMap[emailID] = otpProps;
    }
}