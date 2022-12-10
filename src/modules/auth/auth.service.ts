import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { IOTPRepo } from "./repo/OTPRepo";
import { Otp } from "./domain/Otp";
import { VerifyOtpResponseDTO } from "./dto/VerifyOtpReponse";
import { NotificationService } from "../notifications/notification.service";
import { SMSService } from "../common/sms.service";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { Utils } from "../../core/utils/Utils";
import { STATIC_DEV_OTP } from "../../config/ConfigurationUtils";

@Injectable()
export abstract class AuthService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("OTPRepo")
  private readonly otpRepo: IOTPRepo;

  @Inject()
  private readonly notificationService: NotificationService;

  @Inject()
  private readonly smsService: SMSService;

  @Inject()
  private readonly jwtService: JwtService;

  private otpOverride: number;

  constructor(private readonly configService: CustomConfigService) {
    this.otpOverride = this.configService.get(STATIC_DEV_OTP);
  }

  async validateAndGetUserId(emailOrPhone: string, enteredOtp: number): Promise<string> {
    const actualOtp: Otp = await this.otpRepo.getOTP(emailOrPhone, this.getIdentityType());
    const currentDateTime: number = new Date().getTime();

    if (actualOtp.props.otp != enteredOtp || currentDateTime > actualOtp.props.otpExpiryTime) {
      throw new UnauthorizedException();
    } else {
      await this.otpRepo.deleteOTP(actualOtp.props._id); // Delete the OTP
      return this.getUserId(emailOrPhone);
    }
  }

  async generateAccessToken(id: string): Promise<VerifyOtpResponseDTO> {
    const payload = {
      id: id,
      identityType: this.getIdentityType(),
    };
    return {
      access_token: this.jwtService.sign(payload),
      user_id: id,
    };
  }

  async deleteAnyExistingOTP(emailOrPhone: string): Promise<void> {
    await this.otpRepo.deleteAllOTPsForUser(emailOrPhone, this.getIdentityType());
  }

  async saveOtp(emailOrPhone: string, otp: number): Promise<void> {
    await this.otpRepo.saveOTP(emailOrPhone, otp, this.getIdentityType());
  }

  async sendOtp(emailOrPhone: string, otp: string): Promise<void> {
    const isEmail = Utils.isEmail(emailOrPhone);
    if (isEmail) {
      await this.notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, {
        email: emailOrPhone,
        otp: otp,
      });
    } else {
      await this.smsService.sendSMS(emailOrPhone, `${otp} is your one-time password for Noba login.`);
    }
  }

  generateOTP(): number {
    return this.otpOverride ?? Utils.generateOTP();
  }

  async verifyUserExistence(emailOrPhone: string): Promise<boolean> {
    return await this.isUserSignedUp(emailOrPhone);
  }

  async deleteAllExpiredOTPs(): Promise<void> {
    return this.otpRepo.deleteAllExpiredOTPs();
  }

  protected abstract getIdentityType();

  protected abstract getUserId(emailOrPhone: string): Promise<string>;
  protected abstract isUserSignedUp(emailOrPhone: string): Promise<boolean>;
}
