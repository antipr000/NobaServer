import { Body, Controller, Get, HttpStatus, Post, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EmailService } from "../common/email.service";
import { AuthService } from "./auth.service";
import { LoginRequestDTO } from "./dto/LoginRequest";
import { VerifyOtpResponseDTO } from "./dto/VerifyOtpReponse";
import { VerifyOtpRequestDTO } from "./dto/VerifyOtpRequest";
import { LocalAuthGuard } from "./local-auth.guard";
import { Public } from "./public.decorator";

@Controller("auth")
export class AuthController {
    constructor(
        private authService: AuthService, 
        private emailService: EmailService) {}

    @Public()
    @UseGuards(LocalAuthGuard)
    @Post('/verifyOtp')
    @ApiOperation({ summary: 'Send the OTP filled in by the user to Noba Server and get the access token' })
    @ApiResponse({ status: HttpStatus.OK, type: VerifyOtpResponseDTO, description: "Noba access token of the user" })
    async verifyOtp(@Request() request, @Body() requestBody: VerifyOtpRequestDTO): Promise<VerifyOtpResponseDTO> {
        return this.authService.login(request.user);
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
