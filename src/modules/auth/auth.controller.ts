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
import { ApiForbiddenResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
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
import { X_NOBA_API_KEY, X_NOBA_SIGNATURE, X_NOBA_TIMESTAMP } from "./domain/HeaderConstants";
import { HeaderValidationService } from "./header.validation.service";
import { PartnerService } from "../partner/partner.service";

@Controller("auth")
@ApiTags("Authentication")
export class AuthController {
  @Inject()
  private readonly consumerAuthService: UserAuthService;
  @Inject()
  private readonly adminAuthService: AdminAuthService;
  @Inject()
  private readonly partnerAuthService: PartnerAuthService;
  @Inject()
  private readonly partnerService: PartnerService;
  @Inject()
  private readonly headerValidationService: HeaderValidationService;

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
  async verifyOtp(
    @Body() requestBody: VerifyOtpRequestDTO,
    @Headers(X_NOBA_API_KEY) apiKey: string,
    @Headers(X_NOBA_TIMESTAMP) timestamp: string,
    @Headers(X_NOBA_SIGNATURE) signature: string,
  ): Promise<VerifyOtpResponseDTO> {
    const authService: AuthService = this.getAuthService(requestBody.identityType);
    await this.headerValidationService.validateApiKeyAndSignature(
      apiKey,
      timestamp,
      signature,
      /*requestMethod = */ "POST",
      /*requestPath = */ "/v1/auth/verifyotp",
      JSON.stringify(requestBody),
    );
    const partnerId = (await this.partnerService.getPartnerFromApiKey(apiKey)).props._id;
    const userId: string = await authService.validateAndGetUserId(requestBody.emailOrPhone, requestBody.otp, partnerId);
    return authService.generateAccessToken(userId, partnerId);
  }

  @Public()
  @ApiOperation({ summary: "Logs user in and sends one-time passcode (OTP) to the provided email address" })
  @ApiResponse({ status: HttpStatus.OK, description: "Email successfully sent" })
  @ApiForbiddenResponse({ description: "Account does not exist" })
  @Post("/login")
  async loginUser(
    @Body() requestBody: LoginRequestDTO,
    @Headers(X_NOBA_API_KEY) apiKey: string,
    @Headers(X_NOBA_TIMESTAMP) timestamp: string,
    @Headers(X_NOBA_SIGNATURE) signature: string,
  ) {
    const authService: AuthService = this.getAuthService(requestBody.identityType);

    const isLoginAllowed = await authService.verifyUserExistence(requestBody.email);
    if (!isLoginAllowed) {
      throw new ForbiddenException(
        `User "${requestBody.email}" is not allowed to login as identity "${requestBody.identityType}". ` +
          "Please contact support team, if you think this is an error.",
      );
    }

    await this.headerValidationService.validateApiKeyAndSignature(
      apiKey,
      timestamp,
      signature,
      /*requestMethod = */ "POST",
      /*requestPath = */ "/v1/auth/login",
      JSON.stringify(requestBody),
    );

    const partnerId = (await this.partnerService.getPartnerFromApiKey(apiKey)).props._id;
    const otp = authService.createOtp();
    await authService.deleteAnyExistingOTP(requestBody.email);
    await authService.saveOtp(requestBody.email, otp, partnerId);
    return authService.sendOtp(requestBody["email"], otp.toString()); //TODO change parameter to emailOrPhone, front end client also need to be updated
  }
}
