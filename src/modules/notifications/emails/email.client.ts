import { Logger } from "winston";
import { EmailRequest } from "../domain/EmailTypes";

export abstract class EmailClient {
  abstract sendEmailInternal(request: EmailRequest): Promise<void>;

  constructor(protected readonly logger: Logger) {}

  async sendEmail(request: EmailRequest): Promise<void> {
    this.logger.info(`Sending email with following parameters: ${JSON.stringify(request)}`);
    try {
      await this.sendEmailInternal(request);
    } catch (e) {
      this.logger.warn(`Failed to send email. Reason: ${e.message}`);
    }
  }
}
