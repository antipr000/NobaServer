import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeaders,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AdminAuthService } from "./admin.auth.service";
import { AuthService } from "./auth.service";
import { allIdentities, consumerIdentityIdentifier, nobaAdminIdentityIdentifier } from "./domain/IdentityType";
import { LoginRequestDTO } from "./dto/LoginRequest";
import { LoginResponseDTO } from "./dto/LoginResponse";
import { VerifyOtpRequestDTO } from "./dto/VerifyOtpRequest";
import { Public, IsNoApiKeyNeeded } from "./public.decorator";
import { UserAuthService } from "./user.auth.service";
import { getCommonHeaders } from "../../core/utils/CommonHeaders";
import { NewAccessTokenRequestDTO } from "./dto/NewAccessTokenRequest";
import { BlankResponseDTO } from "../common/dto/BlankResponseDTO";
import { AdminAuthGuard } from "./admin-auth.guard";

@Controller("v1/auth")
@ApiBearerAuth("JWT-auth")
@ApiTags("Authentication")
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
  @Post("/accesstoken")
  @ApiOperation({ summary: "returns a new JWT based access token with a refresh token" })
  @ApiResponse({ status: HttpStatus.OK, type: LoginResponseDTO, description: "API new access token and refresh token" })
  @ApiUnauthorizedResponse({ description: "Invalid Refresh Token, either already used or expired" })
  @ApiHeaders(getCommonHeaders())
  async newAccessToken(@Body() requestBody: NewAccessTokenRequestDTO): Promise<LoginResponseDTO> {
    const authService: AuthService = this.getAuthService(consumerIdentityIdentifier);

    const isValidToken = await authService.validateToken(requestBody.refreshToken, requestBody.userID);

    if (!isValidToken) {
      throw new UnauthorizedException("Invalid refresh token, either it is already used or expired");
    }

    await authService.invalidateToken(requestBody.refreshToken, requestBody.userID);

    return authService.generateAccessToken(requestBody.userID, true);
  }

  @Public()
  @Post("/verifyotp")
  @ApiOperation({ summary: "Submits the one-time passcode (OTP) to retreive an API access token" })
  @ApiResponse({ status: HttpStatus.ACCEPTED, type: LoginResponseDTO, description: "API access token" })
  @ApiUnauthorizedResponse({ description: "Invalid OTP" })
  @ApiHeaders(getCommonHeaders())
  async verifyOtp(@Body() requestBody: VerifyOtpRequestDTO): Promise<LoginResponseDTO> {
    const authService: AuthService = this.getAuthService(consumerIdentityIdentifier);

    const userId: string = await authService.validateAndGetUserId(requestBody.emailOrPhone, requestBody.otp);
    return authService.generateAccessToken(userId, requestBody.includeRefreshToken);
  }

  @Public()
  @ApiOperation({ summary: "Logs user in and sends one-time passcode (OTP) to the provided email address" })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: "OTP successfully sent.", type: BlankResponseDTO })
  @ApiForbiddenResponse({ description: "Access denied" })
  @Post("/login")
  @ApiHeaders(getCommonHeaders())
  async loginUser(@Body() requestBody: LoginRequestDTO): Promise<BlankResponseDTO> {
    const emailOrPhone = requestBody.emailOrPhone;

    const autoCreate = requestBody.autoCreate ?? true;

    const authService: AuthService = this.getAuthService(consumerIdentityIdentifier);
    const userExists = await authService.verifyUserExistence(emailOrPhone);
    if (!autoCreate) {
      // Signin flow
      if (!userExists) {
        throw new ForbiddenException(`User "${emailOrPhone}" is not registered or not authorized to log in.`);
      }
    } else {
      // Signup flow
      {
        if (userExists)
          throw new ForbiddenException(`User "${emailOrPhone}" is already registered - use log in flow instead.`);
      }
    }

    const otp = authService.generateOTP(emailOrPhone);

    await authService.saveOtp(emailOrPhone, otp);
    await authService.sendOtp(emailOrPhone, otp.toString());
    return {};
  }

  @IsNoApiKeyNeeded()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: "Logs admin in and sends one-time passcode (OTP) to the provided email address" })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: "OTP successfully sent.", type: BlankResponseDTO })
  @ApiForbiddenResponse({ description: "Access denied" })
  @Post("/admin/login")
  async loginAdmin(@Body() requestBody: LoginRequestDTO): Promise<BlankResponseDTO> {
    const emailOrPhone = requestBody.emailOrPhone;
    const authService = this.getAuthService(nobaAdminIdentityIdentifier);
    const userExists = await authService.verifyUserExistence(emailOrPhone);

    if (!userExists) {
      throw new ForbiddenException(`User "${emailOrPhone}" is not registered or not authorized to log in.`);
    }

    const otp = authService.generateOTP(emailOrPhone);

    await authService.saveOtp(emailOrPhone, otp);
    await authService.sendOtp(emailOrPhone, otp.toString());
    return {};
  }

  @IsNoApiKeyNeeded()
  @UseGuards(AdminAuthGuard)
  @ApiOperation({ summary: "Submits the one-time passcode (OTP) to retreive an API access token" })
  @ApiResponse({ status: HttpStatus.OK, type: LoginResponseDTO, description: "API access token" })
  @HttpCode(HttpStatus.OK)
  @ApiUnauthorizedResponse({ description: "Invalid OTP" })
  @Post("/admin/verifyotp")
  async verifyAdminOtp(@Body() requestBody: VerifyOtpRequestDTO): Promise<LoginResponseDTO> {
    const authService: AuthService = this.getAuthService(nobaAdminIdentityIdentifier);

    const userId: string = await authService.validateAndGetUserId(requestBody.emailOrPhone, requestBody.otp);
    return authService.generateAccessToken(userId, false);
  }
}
