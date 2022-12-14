import { Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { VerifyOtpResponseDTO } from "./dto/VerifyOtpReponse";
import { NotificationService } from "../notifications/notification.service";
import { SMSService } from "../common/sms.service";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { Utils } from "../../core/utils/Utils";
import { STATIC_DEV_OTP } from "../../config/ConfigurationUtils";
import { OTPService } from "../common/otp.service";

@Injectable()
export abstract class AuthService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject()
  private readonly otpService: OTPService;

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
    const isOtpValid: boolean = await this.otpService.checkIfOTPIsValidAndCleanup(
      emailOrPhone,
      this.getIdentityType(),
      enteredOtp,
    );
    if (!isOtpValid) {
      throw new UnauthorizedException();
    } else {
      return this.getUserId(emailOrPhone);
    }
  }

  async generateAccessToken(id: string): Promise<VerifyOtpResponseDTO> {
    const payload = {
      id: id,
      identityType: this.getIdentityType(),
    };
    return {
      accessToken: this.jwtService.sign(payload),
      userID: id,
    };
  }

  async saveOtp(emailOrPhone: string, otp: number): Promise<void> {
    await this.otpService.saveOTP(emailOrPhone, this.getIdentityType(), otp);
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

  protected abstract getIdentityType();

  protected abstract getUserId(emailOrPhone: string): Promise<string>;
  protected abstract isUserSignedUp(emailOrPhone: string): Promise<boolean>;
}
