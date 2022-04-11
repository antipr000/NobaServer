import { Controller, Body, Post, UseGuards, Request, Get, HttpStatus } from "@nestjs/common";
import { LocalAuthGuard } from "./local-auth.guard";
import { AuthService } from "./auth.service";
import { EmailService } from "../common/email.service";
import { LoginRequestDTO } from "./dto/LoginRequest";
import { ApiResponse } from "@nestjs/swagger";
import { Public } from "./public.decorator";
import { VerifyOtpRequestDTO } from "./dto/VerifyOtpRequest";
import { VerifyOtpResponseDTO } from "./dto/VerifyOtpReponse";
import { ApiBearerAuth } from "@nestjs/swagger";

@Controller("auth")
export class AuthController {
    constructor(
        private authService: AuthService, 
        private emailService: EmailService) {}

    @Public()
    @UseGuards(LocalAuthGuard)
    @Post('/verifyOtp')
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
    async testAuth(@Request() request): Promise<string> {
        return request.user._id;
    }
}