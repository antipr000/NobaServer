import { Controller, Get, HttpStatus, Inject, Logger, Param, Query } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { isDynamoDBItemNotFoundException } from "src/core/utils/Utils";
import { UserService } from "../user/user.service";
import { AuthUser } from "./auth.decorator";
import { AuthenticatedUser } from "./domain/AuthenticatedUser";



@Controller("auth")
export class AuthenticationController {

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;

    constructor(private readonly userService: UserService) {

    }

    @ApiResponse({ status: HttpStatus.OK, description: "Returns id of authenticated user" })
    @Get("uid")
    async getUID(@AuthUser() user: AuthenticatedUser): Promise<string> {
        return user.uid;
    }

    @ApiResponse({ status: HttpStatus.OK, description: "Returns id of authenticated user" })
    @Get("otp/:emailID")
    async getOTP(@Param("emailID") emailID: string): Promise<string> {
        //TODO write logic to genrate 6 digit number save in some cache or db with expiry time
        return "OTP Sent to email";
    }

    

}


