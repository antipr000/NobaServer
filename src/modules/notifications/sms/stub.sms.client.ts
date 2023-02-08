import { Inject, Injectable } from "@nestjs/common";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { SMSClient } from "./sms.client";
import { TemplatePayload } from "./templates.sms";

@Injectable()
export class StubSMSClient extends SMSClient {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) logger: Logger) {
    super(logger);
  }

  async sendSMSInternal(
    recipientPhoneNumber: string,
    templateKey: string,
    templatePayload: TemplatePayload,
  ): Promise<void> {
    this.logger.debug(
      `Faking the email sending with following parameters: ${recipientPhoneNumber}, ${templateKey}, ${templatePayload}`,
    );
  }
}
