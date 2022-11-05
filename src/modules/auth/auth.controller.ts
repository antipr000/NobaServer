import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpStatus,
  Inject,
  Post,
} from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AdminAuthService } from "./admin.auth.service";
import { AuthService } from "./auth.service";
import {
  allIdentities,
  consumerIdentityIdentifier,
  nobaAdminIdentityIdentifier,
  partnerAdminIdentityIdenitfier,
} from "./domain/IdentityType";
import { LoginRequestDTO } from "./dto/LoginRequest";
import { VerifyOtpResponseDTO } from "./dto/VerifyOtpReponse";
import { VerifyOtpRequestDTO } from "./dto/VerifyOtpRequest";
import { PartnerAuthService } from "./partner.auth.service";
import { Public } from "./public.decorator";
import { UserAuthService } from "./user.auth.service";
import { PartnerService } from "../partner/partner.service";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { X_NOBA_API_KEY } from "./domain/HeaderConstants";
import { Utils } from "../../core/utils/Utils";

@Controller("auth")
@ApiTags("Authentication")
@ApiHeaders(getCommonHeaders())
export class AuthController {
  @Inject()
  private readonly consumerAuthService: UserAuthService;
  @Inject()
  private readonly adminAuthService: AdminAuthService;
  @Inject()
  private readonly partnerAuthService: PartnerAuthService;
  @Inject()
  private readonly partnerService: PartnerService;

  private getAuthService(identityType: string): AuthService {
    switch (identityType) {
      case consumerIdentityIdentifier:
        return this.consumerAuthService;
      case nobaAdminIdentityIdentifier:
        return this.adminAuthService;
      case partnerAdminIdentityIdenitfier:
        return this.partnerAuthService;
      default:
        throw new BadRequestException(`"identityType" should be one of "${allIdentities}"`);
    }
  }

  @Public()
  @Post("/verifyotp")
  @ApiOperation({ summary: "Submits the one-time passcode (OTP) to retreive an API access token" })
  @ApiResponse({ status: HttpStatus.OK, type: VerifyOtpResponseDTO, description: "API access token" })
  @ApiUnauthorizedResponse({ description: "Invalid OTP" })
  async verifyOtp(@Body() requestBody: VerifyOtpRequestDTO, @Headers() headers): Promise<VerifyOtpResponseDTO> {
    const isEmail = Utils.isEmail(requestBody.emailOrPhone);
    const authService: AuthService = this.getAuthService(requestBody.identityType);
    const partnerId = (await this.partnerService.getPartnerFromApiKey(headers[X_NOBA_API_KEY.toLowerCase()])).props._id;

    const shouldCreateAccountIfNotExists = requestBody.createAccountIfNotExists ?? true;

    if (requestBody.identityType !== consumerIdentityIdentifier && !isEmail) {
      throw new BadRequestException(
        `Phone number based login is not supported for this identity type ${requestBody.identityType}`,
      );
    }

    // TODO: figure out how to get partner's user ID from request & pass as parameter 4 of this method:
    const userId: string = await authService.validateAndGetUserId(
      requestBody.emailOrPhone,
      requestBody.otp,
      partnerId,
      shouldCreateAccountIfNotExists, //by default create account if not exists
    );
    return authService.generateAccessToken(userId, partnerId);
  }

  @Public()
  @ApiOperation({ summary: "Logs user in and sends one-time passcode (OTP) to the provided email address" })
  @ApiResponse({ status: HttpStatus.OK, description: "OTP successfully sent." })
  @ApiForbiddenResponse({ description: "Access denied" })
  @Post("/login")
  async loginUser(@Body() requestBody: LoginRequestDTO, @Headers() headers) {
    const emailOrPhone = requestBody.emailOrPhone ?? requestBody.email;
    const isEmail = Utils.isEmail(emailOrPhone);

    if (requestBody.identityType !== consumerIdentityIdentifier && !isEmail) {
      throw new BadRequestException(
        `Phone number based login is not supported for this identity type ${requestBody.identityType}`,
      );
    }

    const authService: AuthService = this.getAuthService(requestBody.identityType);
    const isLoginAllowed = await authService.verifyUserExistence(emailOrPhone);
    if (!isLoginAllowed) {
      throw new ForbiddenException(
        `User "${emailOrPhone}" is not allowed to login as identity "${requestBody.identityType}". ` +
          "Please contact support team, if you think this is an error.",
      );
    }
    const partnerId = (await this.partnerService.getPartnerFromApiKey(headers[X_NOBA_API_KEY.toLowerCase()])).props._id;
    const otp = authService.createOtp();
    await authService.deleteAnyExistingOTP(emailOrPhone);
    await authService.saveOtp(emailOrPhone, otp, partnerId);
    return authService.sendOtp(emailOrPhone, otp.toString(), partnerId);
  }
}
