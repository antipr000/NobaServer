import { Inject, Injectable } from "@nestjs/common";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { SMSClient } from "./sms.client";
import { TemplatePayload } from "./templates.sms";
import { SMSData } from "../dto/LatestNotificationResponseDTO";

@Injectable()
export class StubSMSClient extends SMSClient {
  private smsData: SMSData[] = [];
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
    this.smsData.push({
      recipientPhoneNumber,
      templateKey,
      payload: templatePayload,
    });
  }

  getPreviousSMS(): SMSData[] {
    return this.smsData;
  }
  clearPreviousSMS(): void {
    this.smsData = [];
  }
}
