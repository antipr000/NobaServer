import { Injectable } from "@nestjs/common";
import { CustomConfigService } from "../../core/utils/AppConfigModule";
import { Twilio } from "twilio";
import { TwilioConfigs } from "../../config/configtypes/TwilioConfigs";
import { TWILIO_CONFIG_KEY } from "../../config/ConfigurationUtils";

@Injectable()
export class SMSService {
  private readonly twilioClient;
  private readonly twilioConfigs: TwilioConfigs;

  constructor(configService: CustomConfigService) {
    this.twilioConfigs = configService.get<TwilioConfigs>(TWILIO_CONFIG_KEY);
    this.twilioClient = new Twilio(this.twilioConfigs.SID, this.twilioConfigs.authToken);
    // console.log("print twilio configs", this.twilioConfigs);
  }

  public async sendSMS(recipientPhoneNumber: string, smsBody: string) {
    const smsResponse = await this.twilioClient.messages.create({
      from: this.twilioConfigs.fromPhoneNumber,
      to: recipientPhoneNumber,
      body: smsBody,
    });
    // console.log(smsResponse.sid);
  }
}
