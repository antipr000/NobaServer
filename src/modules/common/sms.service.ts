import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Twilio } from "twilio";
import { TwilioConfigs } from "../../config/configtypes/TwilioConfigs";
import { TWILIO_CONFIG_KEY } from "../../config/ConfigurationUtils";



@Injectable()
export class SMSService {

    private readonly twilioClient;
    private readonly twilioConfigs: TwilioConfigs;
    

    constructor(configService: ConfigService) {
        this.twilioConfigs = configService.get<TwilioConfigs>(TWILIO_CONFIG_KEY);
        this.twilioClient = new Twilio(this.twilioConfigs.SID, this.twilioConfigs.authToken);
        // console.log("print twilio configs", this.twilioConfigs);
    }

  public async sendOtp(recipientPhoneNumber: string, otp: string) {
        const smsResponse = await this.twilioClient.messages.create({
            from: this.twilioConfigs.fromPhoneNumber,
            to: recipientPhoneNumber,
            body: `${otp} is your one time password for Noba Pay login.`, 
        })
        // console.log(smsResponse.sid);
  }
}