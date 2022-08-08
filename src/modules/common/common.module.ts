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
import { MongoDBLockRepo } from "./repo/MongoDBLockRepo";
import { LockService } from "./lock.service";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";

@Module({
  imports: [InfraProvidersModule],
  providers: [
    DBProvider,
    CsvService,
    CheckoutService,
    EmailService,
    SMSService,
    KmsService,
    CurrencyService,
    LocationService,
    ConfigurationProviderService,
    {
      provide: "LockRepo",
      useClass: MongoDBLockRepo,
    },
    LockService,
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
    LockService,
  ],
})
export class CommonModule {}
