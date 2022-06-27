import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SendGridConfigs } from "../../config/configtypes/SendGridConfigs";
import { SENDGRID_CONFIG_KEY } from "../../config/ConfigurationUtils";
import * as sgMail from "@sendgrid/mail";
import { CustomConfigService } from "../../core/utils/AppConfigModule";

@Injectable()
export class EmailService {
  constructor(configService: CustomConfigService) {
    const sendGridApiKey = configService.get<SendGridConfigs>(SENDGRID_CONFIG_KEY).apiKey;
    sgMail.setApiKey(sendGridApiKey);
  }

  public async sendOtp(email: string, otp: string, name?: string) {
    //TODO send email with otp

    const msg = {
      to: email,
      from: "Noba Pay <auth@noba.com>",
      templateId: "d-62a393f5f89949f5a5a3d244a51ed2e7", //this is template id for sending otp without any context, see sendgrid dashboard
      dynamicTemplateData: {
        user: name ?? "",
        one_time_password: otp,
      },
    };

    await sgMail.send(msg);
  }
}
