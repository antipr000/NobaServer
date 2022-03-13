import {  HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AppEnvironment } from 'src/config/ConfigurationUtils';
import { AuthenticatedUser } from './domain/AuthenticatedUser';
import * as fs from 'fs-extra';
import { AuthService } from './auth.service';





//********** THIS IS VERY CRITICAL CODE (AUTHENTICATION), ONLY MAKE CHANGES HERE IF YOU KNOW WHAT YOU ARE DOING */
@Injectable()
export class PreauthMiddleware implements NestMiddleware {


    constructor(private readonly configService: ConfigService, private readonly authService: AuthService) {
        
    }

    use(req: Request, res: Response, next: ()=>void) {

        const envType = this.configService.get("envType");
        
        if(envType===AppEnvironment.DEV){
            // console.log("auth token", req.headers.authorization); //TO get your auth token to put in localdevelopment.yaml file uncomment this line, take the token and restart server
            if(!req.headers.authorization) {//only for testing
                req.headers.authorization = fs.readFileSync("./authtoken.txt",'utf8');
            }
            else {
                fs.writeFileSync("./authtoken.txt", req.headers.authorization);
            }
        }


        const url =  req.originalUrl;
        const token = req.headers.authorization;

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
