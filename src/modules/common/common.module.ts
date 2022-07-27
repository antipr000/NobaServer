import { Module } from "@nestjs/common";
import {} from "aws-sdk";
import { CheckoutService } from "./checkout.service";
import { CsvService } from "./csv.service";
import { CurrencyService } from "./currency.service";
import { LocationService } from "./location.service";
import { EmailService } from "./email.service";
import { KmsService } from "./kms.service";
import { SMSService } from "./sms.service";
import { ConfigurationProviderService } from "./configuration.provider.service";

@Module({
  imports: [],
  providers: [
    CsvService,
    CheckoutService,
    EmailService,
    SMSService,
    KmsService,
    CurrencyService,
    LocationService,
    ConfigurationProviderService,
  ],
  exports: [
    CsvService,
    CheckoutService,
    EmailService,
    SMSService,
    KmsService,
    CurrencyService,
    LocationService,
    ConfigurationProviderService,
  ],
})
export class CommonModule {}
