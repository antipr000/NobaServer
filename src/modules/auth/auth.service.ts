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

@Injectable()
export class AuthService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;
    private readonly otpRepo: IOTPRepo;
    constructor(
        dbProvider: DBProvider,
        private jwtService: JwtService,
        private userService: UserService
    ) {
        this.otpRepo = new MongoDBOtpRepo(dbProvider);
    }

    async validateUser(email: string, otp: number): Promise<AuthenticatedUser> {
        const user: Otp = await this.otpRepo.getOTP(email);
        const currentDateTime: number = new Date().getTime();
        if(user.props.otp === otp && currentDateTime <= user.props.otpExpiryTime) {
            this.userService.createUserIfFirstTimeLogin(email);
            return {
                email
            };
        }
        return null;
    }

    async login(user: AuthenticatedUser): Promise<VerifyOtpResponseDTO> {
        const payload = { email: user.email };
        return {
            access_token: this.jwtService.sign(payload)
        };
    }

    async saveOtp(email: string, otp: number): Promise<void> {
        await this.otpRepo.saveOTP(email, otp);
    }

    public createOtp(): number {
        return Math.floor(100000 + Math.random() * 900000);
    }
}
