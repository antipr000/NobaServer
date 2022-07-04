import { Module } from "@nestjs/common";
import {} from "aws-sdk";
import { CheckoutService } from "./checkout.service";
import { CsvService } from "./csv.service";
import { EmailService } from "./email.service";
import { SMSService } from "./sms.service";
import { StripeService } from "./stripe.service";

@Module({
  imports: [],
  providers: [CsvService, StripeService, CheckoutService, EmailService, SMSService],
  exports: [CsvService, StripeService, CheckoutService, EmailService, SMSService],
})
export class CommonModule {}
