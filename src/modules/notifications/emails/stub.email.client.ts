import { Inject, Injectable } from "@nestjs/common";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { EmailClient } from "./email.client";
import { EmailRequest } from "../domain/EmailTypes";

@Injectable()
export class StubEmailClient implements EmailClient {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  async sendEmail(request: EmailRequest): Promise<void> {
    this.logger.debug(`Faking the email sending with following parameters: ${JSON.stringify(request)}`);
  }
}
