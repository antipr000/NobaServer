import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { } from "aws-sdk";
import { CsvService } from "./csv.service";
import { EmailService } from "./email.service";
import { SMSService } from "./sms.service";
import { StripeService } from "./stripe.service";

@Module({
  imports: [],
  providers: [CsvService, StripeService, EmailService, SMSService],
  exports: [CsvService, StripeService, EmailService, SMSService],
})
export class CommonModule { }
