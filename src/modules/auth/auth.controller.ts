import { Body, Controller, Get, HttpStatus, Post, Request } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { AuthenticatedUser } from "./domain/AuthenticatedUser";
import { LoginRequestDTO } from "./dto/LoginRequest";
import { VerifyOtpResponseDTO } from "./dto/VerifyOtpReponse";
import { VerifyOtpRequestDTO } from "./dto/VerifyOtpRequest";
import { Public } from "./public.decorator";

@Controller("auth")
@ApiTags('Authentication')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Public()
    @Post('/verifyOtp')
    @ApiOperation({ summary: 'Send the OTP filled in by the user to Noba Server and get the access token' })
    @ApiResponse({ status: HttpStatus.OK, type: VerifyOtpResponseDTO, description: "Noba access token of the user" })
    async verifyOtp(@Body() request: VerifyOtpRequestDTO): Promise<VerifyOtpResponseDTO> {
        const userId: string =
            await this.authService.validateAndGetUserId(request.emailOrPhone, request.otp);
        return this.authService.generateAccessToken(userId);
    }

    @Public()
    @ApiOperation({ summary: 'Sends otp to the email/phone provided' })
    @ApiResponse({ status: HttpStatus.OK, description: "Email successfully sent" })
    @Post("/login")
    async loginUser(@Body() request: LoginRequestDTO) {
        const otp = this.authService.createOtp();
        await this.authService.saveOtp(request.email, otp);
        return this.authService.sendOtp(request["email"], otp.toString());//TODO change parameter to emailOrPhone, front end client also need to be updated
    }

    @ApiBearerAuth()
    @Get("/userId")
    @ApiOperation({ summary: 'Get the Noba user ID for the authorized/logged-in user' })
    @ApiResponse({ status: HttpStatus.OK, description: "Noba user ID of logged in user" })
    async testAuth(@Request() request): Promise<string> {
        return request.user._id;
    }
}
