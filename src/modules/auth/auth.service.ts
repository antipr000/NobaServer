import { Inject, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { IOTPRepo } from "./repo/OTPRepo";
import { Otp } from "./domain/Otp";
import { VerifyOtpResponseDTO } from "./dto/VerifyOtpReponse";
import { EmailService } from "../common/email.service";
import { SMSService } from "../common/sms.service";

export abstract class AuthService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("OTPRepo")
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
    } else {
      this.otpRepo.deleteOTP(actualOtp.props._id); // Delete the OTP
    }

    return this.getUserId(emailOrPhone);
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
    const actualOtp: Otp[] = await this.otpRepo.getAllOTPsForUser(emailOrPhone, this.getIdentityType());
    actualOtp.forEach(element => {
      if (element.props._id) {
        // Delete any unused OTPs for this user
        this.otpRepo.deleteOTP(element.props._id);
      }
    });
  }

  async saveOtp(emailOrPhone: string, otp: number): Promise<void> {
    await this.otpRepo.saveOTP(emailOrPhone, otp, this.getIdentityType());
  }

  // TODO: try to separate 'emailOrPhone' by introducing an interface.
  async sendOtp(emailOrPhone: string, otp: string): Promise<void> {
    const isEmail = emailOrPhone.includes("@");
    if (isEmail) {
      await this.emailService.sendOtp(emailOrPhone, otp);
    } else {
      await this.smsService.sendOtp(emailOrPhone, otp);
    }
  }

  public createOtp(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  async verifyUserExistence(emailOrPhone: string): Promise<boolean> {
    return this.isUserSignedUp(emailOrPhone);
  }

  protected abstract getIdentityType();
  // TODO: try to separate 'emailOrPhone' by introducing an interface.
  protected abstract getUserId(emailOrPhone: string): Promise<string>;
  protected abstract isUserSignedUp(emailOrPhone: string): Promise<boolean>;
}
