import {
    Inject,
    Injectable,
    Logger,
  } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Entity } from "../../core/domain/Entity";
import { BadRequestError } from "../../core/exception/CommonAppException";
import { DBProvider } from "../../infraproviders/DBProvider";
import { UserService } from "../user/user.service";
import { IOTPRepo, OTPRepo } from "./repo/OTPRepo";

  
  
  @Injectable()
  export class AuthService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;


    private readonly otpRepo: IOTPRepo;
  
  
    constructor(dbProvider: DBProvider, private readonly userService: UserService) {
        this.otpRepo = new OTPRepo();
    }
  
    private createOTP(length=6): string {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendOTP(emailID: string): Promise<void> {
      const otp = this.createOTP();
      this.otpRepo.saveOTP(emailID, "123456"); //we cannot send an email for now so hard coding to 123456
    }

    async getOTP(emailID: string): Promise<string> {
        return this.otpRepo.getOTP(emailID);
    }

    async verifyOTPAndSaveToken(emailID: string, otp: string): Promise<string>{
        const savedOTP = await this.getOTP(emailID);
        console.log("saved otp", savedOTP);
        if(savedOTP === otp){
            //create user in db if logging in for first time
            await this.userService.createUserIfFirstTimeLogin(emailID);
            const sessionToken = Entity.getNewID();
            await this.otpRepo.saveAuthToken(emailID, sessionToken);//TODO save expiry on session token
            return sessionToken;
        } else {
            throw new BadRequestError({messageForClient: "Invalid OTP"});
        }
    }


    async getEmailIDForToken(authToken: string): Promise<string> { 
        if(authToken=="testtoken") return "John.Doe@noba.com"; //TODO remove this only for testing
        return this.otpRepo.getEmailIDForAuthToken(authToken); 
    }   


  }
  