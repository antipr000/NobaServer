import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from "@nestjs/jwt";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { IOTPRepo } from './repo/OTPRepo';
import { Otp } from './domain/Otp';
import { AuthenticatedUser } from './domain/AuthenticatedUser';
import { UserService } from '../user/user.service';
import { VerifyOtpResponseDTO } from './dto/VerifyOtpReponse';
import { EmailService } from '../common/email.service';
import { SMSService } from '../common/sms.service';

// abstract class with all common functionalities
// 
// user.auth.service.ts
// partner.auth.service.ts
// admin.auth.service.ts
//      - validateUser()
//      - getType()
//      - if-user-can-be-abstracted in ValidateUser

@Injectable()
export class AuthService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;

    @Inject('OTPRepo')
    private readonly otpRepo: IOTPRepo;

    constructor(
        private jwtService: JwtService,
        private userService: UserService,
        private emailService: EmailService,
        private smsService: SMSService
    ) { }

    async validateAndGetUserId(emailOrPhone: string, otp: number): Promise<string> {
        const otpDomain: Otp = await this.otpRepo.getOTP(emailOrPhone);

        const currentDateTime: number = new Date().getTime();
        if (otpDomain.props.otp !== otp || currentDateTime > otpDomain.props.otpExpiryTime) {
            throw new UnauthorizedException();
        }

        const user = await this.userService.createUserIfFirstTimeLogin(emailOrPhone);
        return user._id;
    }

    // getJwtPayload ()

    async generateAccessToken(userId: string): Promise<VerifyOtpResponseDTO> {
        const payload = { id: userId };
        return {
            access_token: this.jwtService.sign(payload),
            user_id: userId
        };
    }

    async saveOtp(emailOrPhone: string, otp: number): Promise<void> {
        await this.otpRepo.saveOTP(emailOrPhone, otp);
    }

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
}
