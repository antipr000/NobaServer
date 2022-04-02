import {  Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthenticatedUser } from './domain/AuthenticatedUser';
import { AuthService } from './auth.service';
import { AppEnvironment } from '../../config/ConfigurationUtils';
import { DBProvider } from '../../infraproviders/DBProvider';
import { UserService } from '../user/user.service';
import { EmailService } from '../common/email.service';


const PUBLIC_URL_REGEXES = [
    /\/auth\/otp/,
    /\/auth\/otp\/verify/,
    /exchangerates/
]



//********** THIS IS VERY CRITICAL CODE (AUTHENTICATION), ONLY MAKE CHANGES HERE IF YOU KNOW WHAT YOU ARE DOING */
@Injectable()
export class PreauthMiddleware implements NestMiddleware {

    @Inject()
    private readonly configService: ConfigService;

    @Inject()
    private readonly dbProvider: DBProvider; 

    @Inject() 
    private readonly userService: UserService

    @Inject()
    private readonly emailService: EmailService;
    

    private readonly authService: AuthService;
    
    constructor() {
        this.authService = new AuthService(this.dbProvider, this.userService, this.emailService);//cannot inject directly as belongs to same module as this middleware
    }

   
    use(req: Request, res: Response, next: ()=>void) {

        const envType = this.configService.get("envType");
        
        const url =  req.originalUrl;
        let token = req.headers.authorization; //TODO remove this when authentication is setup properly

        if (!token && envType === AppEnvironment.DEV) {
            token = "testtoken"; //only for local testing this token will always resolve to John.Doe@noba.com
        }

        if (PUBLIC_URL_REGEXES.some(regex => regex.test(url))) { 
            console.log("URL matches public url allowing without authentication"); //TODO remove this log line? 
            next();
            return;
        }

        if (token) {
            this.authService.getEmailIDForToken(token)
            .then(emailID => {

                    if(!emailID) { 
                        throw new Error ("Token is not valid");
                    }
                    // console.log(decodedToken, "Decoded token");
                    const user: AuthenticatedUser = {
                        email: emailID,
                        uid: emailID
                    }

                    req['user'] = user;
                    next();
                }).catch(error => {
                    //TODO create alert here?
                    console.error(error);
                    this.handleUnauthenticatedRequest(url, res, "Error while authenticating the user");//client can make use of this message to show a message to the user
                });
        } else { 
            this.handleUnauthenticatedRequest(url, res, "Authentication Token missing in the request");
        }
    }

    private handleUnauthenticatedRequest(url: string, res: Response, message?: string) {
        
        res.status(401).json({
            statusCode: 401,
            timestamp: new Date().toISOString(),
            path: url,
            message: message??'Auth token is missing or is invalid. Please try after logging out and logging in again.'
        });
    }
    
}
