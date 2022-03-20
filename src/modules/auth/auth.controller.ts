import { Controller, Get, HttpStatus, Inject, Logger, Param, Post, Query } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { AuthUser } from "./auth.decorator";
import { AuthService } from "./auth.service";
import { AuthenticatedUser } from "./domain/AuthenticatedUser";



@Controller("auth")
export class AuthenticationController {

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;

    constructor(private readonly authService: AuthService) {

    }

    @ApiResponse({ status: HttpStatus.OK, description: "Returns uuid of authenticated user" })
    @Get("userID")
    async getUID(@AuthUser() user: AuthenticatedUser): Promise<string> {
        return user.uid;
    }

    //TODO set limit on number of OTPs sent to user 
    @ApiResponse({ status: HttpStatus.OK, description: "Sends OTP on the given email" })
    @Post("otp/:emailID")
    async sendOTP(@Param("emailID") emailID: string): Promise<string> {
        //TODO write logic to genrate 6 digit number save in some cache or db with expiry time
        await this.authService.sendOTP(emailID);
        return "OTP Sent to email";
    }

    @ApiResponse({ status: HttpStatus.OK, description: "Verifies the OTP and creates user authenticated session. If user doesn't exist with this email will create user entry also in the database" })
    @Post("otp/verify/:emailID/:otp")
    async verifyOTP(@Param("emailID") emailID: string, @Param("otp")otp: string): Promise<string> {
        return await this.authService.verifyOTPAndSaveToken(emailID, otp);
    }

}


