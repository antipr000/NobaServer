import { Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { LoginResponseDTO } from "./dto/LoginResponse";
import { NotificationService } from "../notifications/notification.service";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { NotificationEventType } from "../notifications/domain/NotificationTypes";
import { Utils } from "../../core/utils/Utils";
import { STATIC_DEV_OTP } from "../../config/ConfigurationUtils";
import { OTPService } from "../common/otp.service";
import { ITokenRepo } from "./repo/token.repo";
import { Token } from "./domain/Token";
import { VerificationService } from "../verification/verification.service";
import { IdentityType } from "./domain/IdentityType";
import { NotificationPayloadMapper } from "../notifications/domain/NotificationPayload";

@Injectable()
export abstract class AuthService {
  @Inject(WINSTON_MODULE_PROVIDER)
  private readonly logger: Logger;

  @Inject("TokenRepo")
  private readonly tokenRepo: ITokenRepo;

  @Inject()
  private readonly notificationService: NotificationService;

  @Inject()
  private readonly jwtService: JwtService;

  @Inject()
  private readonly otpService: OTPService;

  @Inject()
  private readonly verificationService: VerificationService;

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

  async validateToken(rawToken: string, userID: string): Promise<boolean> {
    try {
      const token: Token = await this.tokenRepo.getToken(rawToken, userID);
      return token.isMatching(rawToken);
    } catch (error) {
      this.logger.error(`Error while fetching token: ${rawToken} for user: ${userID}, error: ${error}`);
    }

    return false;
  }

  async invalidateToken(rawToken: string, userID: string): Promise<void> {
    await this.tokenRepo.deleteToken(rawToken, userID);
  }

  async generateAccessToken(
    consumerID: string,
    includeRefreshToken?: boolean,
    sessionKey?: string,
  ): Promise<LoginResponseDTO> {
    if (this.getIdentityType() == IdentityType.CONSUMER) {
      // Run login KYC on the user
      if (!sessionKey) {
        this.logger.error(
          `Session key is missing for consumer ${consumerID} access token request. Calling with generic "NOT_PROVIDED" session key.`,
        );
      } else {
        await this.verificationService.verifyConsumerInformationForLogin(consumerID, sessionKey);
        // We don't do anything with the return value (status) here, but the consumer data has been updated and when the caller (app)
        // gets the consumer data it will see that the user is blocked.
      }
    }

    let refreshToken = "";
    if (includeRefreshToken) {
      const { rawToken, saltifiedToken } = Token.generateToken(consumerID);
      refreshToken = rawToken;
      const token = Token.createTokenObject({ id: saltifiedToken, userID: consumerID });
      await this.tokenRepo.saveToken(token);
    }
    const payload = {
      id: consumerID,
      identityType: this.getIdentityType(),
    };
    return {
      accessToken: this.jwtService.sign(payload),
      userID: consumerID,
      refreshToken: refreshToken,
    };
  }

  async saveOtp(emailOrPhone: string, otp: number): Promise<void> {
    await this.otpService.saveOTP(emailOrPhone, this.getIdentityType(), otp);
  }

  async sendOtp(emailOrPhone: string, otp: string): Promise<void> {
    const payload = NotificationPayloadMapper.toOtpEvent(otp, emailOrPhone);
    await this.notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, payload);
  }

  generateOTP(email?: string): number {
    if (this.otpOverride) {
      return this.otpOverride;
    } else if (email?.toLowerCase() === Utils.TEST_USER_EMAIL) {
      return Utils.get6DigitDate();
    } else {
      return Utils.generateOTP();
    }
  }

  async verifyUserExistence(emailOrPhone: string): Promise<boolean> {
    return await this.isUserSignedUp(emailOrPhone);
  }

  protected abstract getIdentityType();

  protected abstract getUserId(emailOrPhone: string): Promise<string>;
  protected abstract isUserSignedUp(emailOrPhone: string): Promise<boolean>;
}
