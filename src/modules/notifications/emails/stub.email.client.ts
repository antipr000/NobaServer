import { Inject, Injectable } from "@nestjs/common";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { EmailClient } from "./email.client";
import { EmailRequest } from "../domain/EmailTypes";
import { EmailData } from "../dto/latestnotification.response.dto";

@Injectable()
export class StubEmailClient extends EmailClient {
  private previousMails: EmailData[] = [];
  constructor(@Inject(WINSTON_MODULE_PROVIDER) logger: Logger) {
    super(logger);
  }

  async sendEmailInternal(request: EmailRequest): Promise<void> {
    this.logger.debug(`Faking the email sending with following parameters: ${JSON.stringify(request)}`);
    this.previousMails.push({
      to: request.to,
      from: request.from,
      templateId: request.templateId,
      dynamicTemplateData: request.dynamicTemplateData,
    });
  }

  getPreviousEmails(): EmailData[] {
    return this.previousMails;
  }
  clearPreviousEmails(): void {
    this.previousMails = [];
  }
}
