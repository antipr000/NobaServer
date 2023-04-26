import { Logger } from "winston";

export abstract class SMSClient {
  constructor(protected readonly logger: Logger) {}

  abstract sendSMSInternal(recipientPhoneNumber: string, body: string): Promise<void>;

  async sendSMS(recipientPhoneNumber: string, body: string): Promise<void> {
    this.logger.info(
      `Sending SMS with the following parameters: recipientPhoneNumber: ${recipientPhoneNumber}, body: ${body}`,
    );
    try {
      await this.sendSMSInternal(recipientPhoneNumber, body);
    } catch (e) {
      this.logger.error(`Failed to send SMS. Reason: ${e.message}`);
    }
  }
}
