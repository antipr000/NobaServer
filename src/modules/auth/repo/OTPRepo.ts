export interface IOTPRepo {
    getOTP(emailID: string): Promise<string>;
    saveOTP(emailID: string, otp: string): Promise<void>;
    saveAuthToken(emailID: string, authToken: string): Promise<void>;
    getEmailIDForAuthToken(authToken: string): Promise<string>;
}

export class OTPRepo implements IOTPRepo {

    private readonly emailToOTPMap; //TODO use reddis or store in Dynamodb? 
    private readonly authTokenToEmailIDMap; 

    constructor() {
        this.emailToOTPMap = {};
        this.authTokenToEmailIDMap = {};
    }

    async getOTP(emailID: string): Promise<string> {
        return this.emailToOTPMap[emailID];
    }
    
    async saveOTP(emailID: string, otp: string): Promise<void> {
        this.emailToOTPMap[emailID] = otp;
    }

    async saveAuthToken(emailID: string, authToken: string): Promise<void> {
        this.authTokenToEmailIDMap[authToken] = emailID;
    }

    async getEmailIDForAuthToken(authToken: string): Promise<string> {
        return this.authTokenToEmailIDMap[authToken];
    }
}