import { Inject, Injectable } from "@nestjs/common";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { SMSClient } from "./sms.client";
import { SMSData } from "../dto/latestnotification.response.dto";

@Injectable()
export class StubSMSClient extends SMSClient {
  private smsData: SMSData[] = [];
  constructor(@Inject(WINSTON_MODULE_PROVIDER) logger: Logger) {
    super(logger);
  }

  async sendSMSInternal(recipientPhoneNumber: string, body: string): Promise<void> {
    this.logger.debug(`Faking the email sending with following parameters: ${recipientPhoneNumber}, ${body}`);
    this.smsData.push({
      recipientPhoneNumber,
      body,
    });
  }

  getPreviousSMS(): SMSData[] {
    return this.smsData;
  }

  clearPreviousSMS(): void {
    this.smsData = [];
  }
}
