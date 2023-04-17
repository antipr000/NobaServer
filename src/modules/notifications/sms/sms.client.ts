import { Logger } from "winston";
import { TemplatePayload } from "./templates.sms";
import { SMSData } from "../dto/LatestNotificationResponseDTO";

export abstract class SMSClient {
  constructor(protected readonly logger: Logger) {}

  abstract sendSMSInternal(recipientPhoneNumber: string, templateKey: string, payload: TemplatePayload): Promise<void>;

  async sendSMS(recipientPhoneNumber: string, templateKey: string, payload: TemplatePayload): Promise<void> {
    this.logger.info(
      `Sending SMS with the following parameters: recipientPhoneNumber: ${recipientPhoneNumber}, templateKey: ${templateKey}, payload: ${JSON.stringify(
        payload,
      )}`,
    );
    try {
      await this.sendSMSInternal(recipientPhoneNumber, templateKey, payload);
    } catch (e) {
      this.logger.error(`Failed to send SMS. Reason: ${e.message}`);
    }
  }

  abstract getPreviousSMS(): SMSData[];

  abstract clearPreviousSMS(): void;
}
