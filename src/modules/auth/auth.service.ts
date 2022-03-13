import {
    Inject,
    Injectable,
    Logger,
  } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Entity } from "../../core/domain/Entity";
import { BadRequestError } from "../../core/exception/CommonAppException";
  import { DBProvider } from "../../infraproviders/DBProvider";
import { IOTPRepo, OTPRepo } from "./repo/OTPRepo";

  
  
  @Injectable()
  export class AuthService {
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger;


    private readonly otpRepo: IOTPRepo;
  
  
    constructor(dbProvider: DBProvider) {
        this.otpRepo = new OTPRepo();
    }
  
    async genOTP(emailID: string): Promise<void> {
      // TODO generate 6 digit number and save in some cache or db with expiry time
      this.otpRepo.saveOTP(emailID, "123456");
    }

    async getOTP(emailID: string): Promise<string> {
        return this.otpRepo.getOTP(emailID);
    }

    async verifyOTPAndSaveToken(emailID: string, otp: string): Promise<void>{
        const savedOTP = await this.getOTP(emailID);
        if(savedOTP === otp){
            const sessionToken = Entity.getNewID();
            this.otpRepo.saveAuthToken(emailID, sessionToken);
        } else {
            throw new BadRequestError({messageForClient: "Invalid OTP"});
        }
    }

    async getEmailIDForToken(authToken: string): Promise<string> { 
        return this.otpRepo.getEmailIDForAuthToken(authToken);
    }   


  }
  