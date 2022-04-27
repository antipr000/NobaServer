import { Body, Controller, Get, HttpStatus, Post, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
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
    @ApiResponse({ status: HttpStatus.OK, type: VerifyOtpResponseDTO, description: "Post the OTP recieved by the user" })
    async verifyOtp(@Request() request, @Body() requestBody: VerifyOtpRequestDTO): Promise<VerifyOtpResponseDTO> {
        return this.authService.login(request.user);
    }

    @Public()
    @ApiResponse({ status: HttpStatus.OK, description: "Sends email with otp" })
    @Post("/login")
    async loginUser(@Body() request: LoginRequestDTO) {
        const otp = this.authService.createOtp();
        this.authService.saveOtp(request.email, otp);
        return this.emailService.sendOtp(request["email"], otp.toString());
    }

    @ApiBearerAuth()
    @Get("/userId")
    @ApiResponse({ status: HttpStatus.OK, description: "Get the Noba user ID for the authorized/logged-in user" })
    async testAuth(@Request() request): Promise<string> {
        return request.user._id;
    }
}
