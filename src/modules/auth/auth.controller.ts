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
  IdentityType,
  nobaAdminIdentityIdentifier,
} from "./domain/IdentityType";
import { LoginRequestDTO } from "./dto/LoginRequest";
import { VerifyOtpResponseDTO } from "./dto/VerifyOtpReponse";
import { VerifyOtpRequestDTO } from "./dto/VerifyOtpRequest";
import { Public } from "./public.decorator";
import { UserAuthService } from "./user.auth.service";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { Utils } from "../../core/utils/Utils";

@Controller("auth")
@ApiTags("Authentication")
@ApiHeaders(getCommonHeaders())
export class AuthController {
  @Inject()
  private readonly consumerAuthService: UserAuthService;
  @Inject()
  private readonly adminAuthService: AdminAuthService;

  private getAuthService(identityType: string): AuthService {
    switch (identityType) {
      case consumerIdentityIdentifier:
        return this.consumerAuthService;
      case nobaAdminIdentityIdentifier:
        return this.adminAuthService;
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

    if (requestBody.identityType !== consumerIdentityIdentifier && !isEmail) {
      throw new BadRequestException(
        `Phone number based login is not supported for this identity type ${requestBody.identityType}`,
      );
    }

    const userId: string = await authService.validateAndGetUserId(requestBody.emailOrPhone, requestBody.otp);
    return authService.generateAccessToken(userId);
  }

  @Public()
  @ApiOperation({ summary: "Logs user in and sends one-time passcode (OTP) to the provided email address" })
  @ApiResponse({ status: HttpStatus.OK, description: "OTP successfully sent." })
  @ApiForbiddenResponse({ description: "Access denied" })
  @Post("/login")
  async loginUser(@Body() requestBody: LoginRequestDTO, @Headers() headers) {
    const emailOrPhone = requestBody.emailOrPhone ?? requestBody.email;
    const isEmail = Utils.isEmail(emailOrPhone);
    const isConsumer = requestBody.identityType === consumerIdentityIdentifier;

    if (!isConsumer && !isEmail) {
      throw new BadRequestException(
        `Phone number based login is not supported for this identity type ${requestBody.identityType}`,
      );
    }

    let autoCreate = requestBody.autoCreate;
    if (autoCreate === undefined) {
      // Set defaults
      switch (requestBody.identityType) {
        case IdentityType.consumer:
          autoCreate = true;
          break;
        case IdentityType.nobaAdmin:
          autoCreate = false;
          break;
      }
    }

    const authService: AuthService = this.getAuthService(requestBody.identityType);

    if (!autoCreate) {
      const isLoginAllowed = await authService.verifyUserExistence(emailOrPhone);
      if (!isLoginAllowed) {
        throw new ForbiddenException(`User "${emailOrPhone}" is not registered or not authorized to log in.`);
      }
    }

    const otp = authService.generateOTP();
    await authService.deleteAnyExistingOTP(emailOrPhone);

    await authService.saveOtp(emailOrPhone, otp);
    return authService.sendOtp(emailOrPhone, otp.toString());
  }
}
