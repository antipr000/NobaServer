import { Injectable, Inject, Logger } from '@nestjs/common';
import { JwtService } from "@nestjs/jwt";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { OTPRepo, IOTPRepo } from './repo/OTPRepo';
import { Otp } from './domain/Otp';
import { AuthenticatedUser } from './domain/AuthenticatedUser';
import { UserService } from '../user/user.service';
import { VerifyOtpResponseDTO } from './dto/VerifyOtpReponse';
import { DBProvider } from '../../infraproviders/DBProvider';
import { MongoDBOtpRepo } from './repo/MongoDBOtpRepo';
import { EmailService } from '../common/email.service';
import { SMSService } from '../common/sms.service';

@Injectable()
export class AuthService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;
    private readonly otpRepo: IOTPRepo;
    constructor(
        dbProvider: DBProvider,
        private jwtService: JwtService,
        private userService: UserService,
        private emailService: EmailService,
        private smsService: SMSService
    ) {
        this.otpRepo = new MongoDBOtpRepo(dbProvider);
    }

    async validateUser(emailOrPhone: string, otp: number): Promise<AuthenticatedUser> {
        const user: Otp = await this.otpRepo.getOTP(emailOrPhone);
        const currentDateTime: number = new Date().getTime();
        if(user.props.otp === otp && currentDateTime <= user.props.otpExpiryTime) {
            const user = await this.userService.createUserIfFirstTimeLogin(emailOrPhone);
            return {
                emailOrPhone: emailOrPhone,
                uid: user._id
            };
        }
        return null;
    }

    async login(user: AuthenticatedUser): Promise<VerifyOtpResponseDTO> {
        const payload = { email: user.emailOrPhone };
        return {
            access_token: this.jwtService.sign(payload),
            user_id: user.uid
        };
    }

    async saveOtp(emailOrPhone: string, otp: number): Promise<void> {
        await this.otpRepo.saveOTP(emailOrPhone, otp);
    }

    async sendOtp(emailOrPhone: string, otp: string): Promise<void> { 
        const isEmail = emailOrPhone.includes('@'); 
        if(isEmail) { 
            await this.emailService.sendOtp(emailOrPhone, otp);
        } else {
            await this.smsService.sendOtp(emailOrPhone, otp);
        }
    }

    public createOtp(): number {
        return Math.floor(100000 + Math.random() * 900000);
    }
}
