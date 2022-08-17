import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { IOTPRepo } from "./repo/OTPRepo";
import { Otp } from "./domain/Otp";
import { VerifyOtpResponseDTO } from "./dto/VerifyOtpReponse";
import { EmailService } from "../common/email.service";
import { SMSService } from "../common/sms.service";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NobaConfigs } from "../../config/configtypes/NobaConfigs";
import { NOBA_CONFIG_KEY } from "../../config/ConfigurationUtils";
import { PartnerService } from "../partner/partner.service";
import { Partner } from "../partner/domain/Partner";
import * as CryptoJS from "crypto-js";
import { HmacSHA256 } from "crypto-js";

@Injectable()
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

  @Inject()
  private readonly partnerService: PartnerService;

  readonly nobaPartnerID: string;

  constructor(private readonly configService: CustomConfigService) {
    this.nobaPartnerID = this.configService.get<NobaConfigs>(NOBA_CONFIG_KEY).partnerID;
  }

  // TODO: try to separate 'emailOrPhone' by introducing an interface.
  async validateAndGetUserId(emailOrPhone: string, enteredOtp: number, partnerID?: string): Promise<string> {
    if (!partnerID || partnerID.length == 0) {
      partnerID = this.nobaPartnerID;
    }
    const actualOtp: Otp = await this.otpRepo.getOTP(emailOrPhone, this.getIdentityType(), partnerID);
    const currentDateTime: number = new Date().getTime();

    if (actualOtp.props.otp !== enteredOtp || currentDateTime > actualOtp.props.otpExpiryTime) {
      throw new UnauthorizedException();
    } else {
      await this.otpRepo.deleteOTP(actualOtp.props._id); // Delete the OTP
      return this.getUserId(emailOrPhone, actualOtp.props.partnerID);
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
      partnerID = this.nobaPartnerID;
    }

    await this.otpRepo.saveOTP(emailOrPhone, otp, this.getIdentityType(), partnerID);
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

  async deleteAllExpiredOTPs(): Promise<void> {
    return this.otpRepo.deleteAllExpiredOTPs();
  }

  async validateApiKeyAndGetPartnerId(
    apiKey: string,
    timestamp: string,
    signature: string,
    requestMethod: string,
    requestPath: string,
    requestBody: string,
  ): Promise<string> {
    try {
      const partner: Partner = await this.partnerService.getPartnerFromApiKey(apiKey);
      const secretKey = CryptoJS.enc.Utf8.parse(partner.props.secretKey);
      const signatureString = CryptoJS.enc.Utf8.parse(`${timestamp}${requestMethod}${requestPath}${requestBody}`);
      const hmacSignatureString = CryptoJS.enc.Hex.stringify(HmacSHA256(signatureString, secretKey));
      if (hmacSignatureString !== signature) {
        this.logger.error(`Signature mismatch. Signature: ${hmacSignatureString}, Expected: ${signature}, 
        timestamp: ${timestamp}, requestMethod: ${requestMethod}, requestPath: ${requestPath}, requestBody: ${requestBody}`);
        throw new BadRequestException("Signature does not match");
      }
      return partner.props._id;
    } catch (e) {
      this.logger.error(e);
      throw new BadRequestException("Failed to validate headers. Reason: " + e.message);
    }
  }

  protected abstract getIdentityType();
  // TODO: try to separate 'emailOrPhone' by introducing an interface.
  protected abstract getUserId(emailOrPhone: string, partnerID?: string): Promise<string>;
  protected abstract isUserSignedUp(emailOrPhone: string): Promise<boolean>;
}
