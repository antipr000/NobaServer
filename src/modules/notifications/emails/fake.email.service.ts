import { Inject, Injectable } from "@nestjs/common";
import { Logger } from "winston";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { EmailService } from "./email.service";
import { EmailRequest } from "../domain/EmailTypes";

@Injectable()
export class FakeEmailService implements EmailService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  async sendEmail(request: EmailRequest): Promise<void> {
    this.logger.debug(`Faking the email sending with following parameters: ${JSON.stringify(request)}`);
  }
}
