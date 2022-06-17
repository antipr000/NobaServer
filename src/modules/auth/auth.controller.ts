import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Inject,
  Post,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
import { Public } from "./public.decorator";
import { UserAuthService } from "./user.auth.service";
import { PartnerAuthService } from "./partner.auth.service";

@Controller("auth")
@ApiTags("Authentication")
export class AuthController {
  @Inject()
  private readonly consumerAuthService: UserAuthService;
  @Inject()
  private readonly adminAuthService: AdminAuthService;
  @Inject()
  private readonly partnerAuthService: PartnerAuthService;

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
  @ApiOperation({ summary: "Send the OTP filled in by the user to Noba Server and get the access token" })
  @ApiResponse({ status: HttpStatus.OK, type: VerifyOtpResponseDTO, description: "Noba access token of the user" })
  async verifyOtp(@Body() request: VerifyOtpRequestDTO): Promise<VerifyOtpResponseDTO> {
    const authService: AuthService = this.getAuthService(request.identityType);

    const userId: string = await authService.validateAndGetUserId(request.emailOrPhone, request.otp);
    return authService.generateAccessToken(userId);
  }

  @Public()
  @ApiOperation({ summary: "Sends otp to the email/phone provided" })
  @ApiResponse({ status: HttpStatus.OK, description: "Email successfully sent" })
  @Post("/login")
  async loginUser(@Body() request: LoginRequestDTO) {
    const authService: AuthService = this.getAuthService(request.identityType);

    const isLoginAllowed = await authService.verifyUserExistence(request.email);
    if (!isLoginAllowed) {
      throw new ForbiddenException(
        `User "${request.email}" is not allowed to login as identity "${request.identityType}". ` +
          "Please contact support team, if you think this is an error.",
      );
    }

    const otp = authService.createOtp();
    await authService.saveOtp(request.email, otp);
    return authService.sendOtp(request["email"], otp.toString()); //TODO change parameter to emailOrPhone, front end client also need to be updated
  }

  // TODO: Fix the type 'any' by introducing 'identityType' in the returned `request.user`.
  @ApiBearerAuth("JWT-auth")
  @Get("/currentUser")
  @ApiOperation({ summary: "Get the Noba user for the authorized/logged-in user" })
  @ApiResponse({ status: HttpStatus.OK, description: "Noba user object of logged in user" })
  async testAuth(@Request() request): Promise<any> {
    return request.user;
  }
}
