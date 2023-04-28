import { SMSClient } from "./sms.client";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { Twilio } from "twilio";
import { TwilioConfigs } from "../../../config/configtypes/TwilioConfigs";
import { TWILIO_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class TwilioSMSClient extends SMSClient {
  private readonly twilioClient;
  private readonly twilioConfigs: TwilioConfigs;

  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) logger: Logger) {
    super(logger);
    this.twilioConfigs = configService.get<TwilioConfigs>(TWILIO_CONFIG_KEY);
    this.twilioClient = new Twilio(this.twilioConfigs.SID, this.twilioConfigs.authToken);
    // console.log("print twilio configs", this.twilioConfigs);
  }

  async sendSMSInternal(recipientPhoneNumber: string, body: string) {
    await this.twilioClient.messages.create({
      from: this.twilioConfigs.fromPhoneNumber,
      to: recipientPhoneNumber,
      body,
    });
  }
}
