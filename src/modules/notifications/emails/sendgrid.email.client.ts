import { Inject, Injectable } from "@nestjs/common";
import sgMail from "@sendgrid/mail";
import { SendGridConfigs } from "../../../config/configtypes/SendGridConfigs";
import { SENDGRID_CONFIG_KEY } from "../../../config/ConfigurationUtils";
import { CustomConfigService } from "../../../core/utils/AppConfigModule";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { EmailClient } from "./email.client";
import { EmailRequest } from "../domain/EmailTypes";

@Injectable()
export class SendgridEmailClient extends EmailClient {
  private readonly suppressEmailsRegex;
  constructor(configService: CustomConfigService, @Inject(WINSTON_MODULE_PROVIDER) logger: Logger) {
    super(logger);
    const sendGridApiKey = configService.get<SendGridConfigs>(SENDGRID_CONFIG_KEY).apiKey;
    sgMail.setApiKey(sendGridApiKey);

    this.suppressEmailsRegex = configService.get<SendGridConfigs>(SENDGRID_CONFIG_KEY).suppressEmailsRegex;
  }

  async sendEmailInternal(request: EmailRequest): Promise<void> {
    if (this.suppressEmailsRegex && request.to.match(this.suppressEmailsRegex)) {
      this.logger.info(`Suppressing email to: ${request.to} due to regex: ${this.suppressEmailsRegex}`);
    } else {
      await sgMail.send(request);
    }
  }
}
