import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { IOTPRepo } from "./repo/OTPRepo";
import { Otp } from "./domain/Otp";
import { VerifyOtpResponseDTO } from "./dto/VerifyOtpReponse";
import { NotificationService } from "../notifications/notification.service";
import { SMSService } from "../common/sms.service";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { PartnerService } from "../partner/partner.service";
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

  @Inject()
  private readonly partnerService: PartnerService;

  private otpOverride: number;

  constructor(private readonly configService: CustomConfigService) {
    this.otpOverride = this.configService.get(STATIC_DEV_OTP);
  }

  async validateAndGetUserId(
    emailOrPhone: string,
    enteredOtp: number,
    partnerID: string,
    partnerUserID?: string,
  ): Promise<string> {
    if (!partnerID || partnerID.length == 0) {
      throw new BadRequestException("Partner ID is required");
    }
    const actualOtp: Otp = await this.otpRepo.getOTP(emailOrPhone, this.getIdentityType(), partnerID);
    const currentDateTime: number = new Date().getTime();

    if (actualOtp.props.otp != enteredOtp || currentDateTime > actualOtp.props.otpExpiryTime) {
      throw new UnauthorizedException();
    } else {
      await this.otpRepo.deleteOTP(actualOtp.props._id); // Delete the OTP
      return this.getUserId(emailOrPhone, actualOtp.props.partnerID, partnerUserID);
    }
  }

  async generateAccessToken(id: string, partnerId: string): Promise<VerifyOtpResponseDTO> {
    const payload = {
      id: id,
      identityType: this.getIdentityType(),
      partnerId: partnerId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user_id: id,
    };
  }

  async deleteAnyExistingOTP(emailOrPhone: string): Promise<void> {
    await this.otpRepo.deleteAllOTPsForUser(emailOrPhone, this.getIdentityType());
  }

  async saveOtp(emailOrPhone: string, otp: number, partnerID?: string): Promise<void> {
    if (!partnerID || partnerID.length == 0) {
      throw new BadRequestException("Partner ID is required");
    }

    await this.otpRepo.saveOTP(emailOrPhone, otp, this.getIdentityType(), partnerID);
  }

  async sendOtp(emailOrPhone: string, otp: string, partnerId: string): Promise<void> {
    const isEmail = Utils.isEmail(emailOrPhone);
    if (isEmail) {
      await this.notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, partnerId, {
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

  protected abstract getUserId(emailOrPhone: string, partnerID: string, partnerUserID?: string): Promise<string>;
  protected abstract isUserSignedUp(emailOrPhone: string): Promise<boolean>;
}
