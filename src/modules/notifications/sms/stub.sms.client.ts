import { Inject, Injectable } from "@nestjs/common";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { SMSClient } from "./sms.client";

@Injectable()
export class StubSMSClient implements SMSClient {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  async sendSMS(recipientPhoneNumber: string, smsBody: string): Promise<void> {
    this.logger.debug(`Faking the email sending with following parameters: ${recipientPhoneNumber}, ${smsBody}`);
  }
}
