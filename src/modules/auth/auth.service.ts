import { Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from "@nestjs/jwt";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { IOTPRepo } from './repo/OTPRepo';
import { Otp } from './domain/Otp';
import { VerifyOtpResponseDTO } from './dto/VerifyOtpReponse';
import { EmailService } from '../common/email.service';
import { SMSService } from '../common/sms.service';

// abstract class with all common functionalities
// 
// partner.auth.service.ts

export abstract class AuthService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;

    @Inject('OTPRepo')
    private readonly otpRepo: IOTPRepo;

    @Inject()
    private readonly emailService: EmailService;

    @Inject()
    private readonly smsService: SMSService;

    @Inject()
    private readonly jwtService: JwtService;

    // TODO: try to separate 'emailOrPhone' by introducing an interface. 
    async validateAndGetUserId(emailOrPhone: string, enteredOtp: number): Promise<string> {
        const actualOtp: Otp = await this.otpRepo.getOTP(emailOrPhone, this.getIdentityType());
        const currentDateTime: number = new Date().getTime();

        if (actualOtp.props.otp !== enteredOtp || currentDateTime > actualOtp.props.otpExpiryTime) {
            throw new UnauthorizedException();
        }
        return this.getUserId(emailOrPhone);
    }

    async generateAccessToken(id: string): Promise<VerifyOtpResponseDTO> {
        const payload = {
            id: id,
            identityType: this.getIdentityType()
        };
        return {
            access_token: this.jwtService.sign(payload),
            user_id: id
        };
    }

    async saveOtp(emailOrPhone: string, otp: number): Promise<void> {
        await this.otpRepo.saveOTP(emailOrPhone, otp);
    }

    // TODO: try to separate 'emailOrPhone' by introducing an interface. 
    async sendOtp(emailOrPhone: string, otp: string): Promise<void> {
        const isEmail = emailOrPhone.includes('@');
        if (isEmail) {
            await this.emailService.sendOtp(emailOrPhone, otp);
        } else {
            await this.smsService.sendOtp(emailOrPhone, otp);
        }
    }

    public createOtp(): number {
        return Math.floor(100000 + Math.random() * 900000);
    }

    protected abstract getIdentityType();
    // TODO: try to separate 'emailOrPhone' by introducing an interface. 
    protected abstract getUserId(emailOrPhone: string): Promise<string>;
}
