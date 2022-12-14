import { Module } from "@nestjs/common";
import {} from "aws-sdk";
import { CsvService } from "./csv.service";
import { CreditCardService } from "./creditcard.service";
import { CurrencyService } from "./currency.service";
import { LocationService } from "./location.service";
import { KmsService } from "./kms.service";
import { SMSService } from "./sms.service";
import { ConfigurationProviderService } from "./configuration.provider.service";
import { MongoDBLockRepo } from "./repo/MongoDBLockRepo";
import { LockService } from "./lock.service";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EllipticService } from "./elliptic.service";
import { MongoDBCreditCardBinDataRepo } from "./repo/MongoDBCreditCardBinDataRepo";
import { SQLOTPRepo } from "./repo/SqlOtpRepo";
import { OTPService } from "./otp.service";

@Module({
  imports: [InfraProvidersModule],
  providers: [
    DBProvider,
    CsvService,
    SMSService,
    KmsService,
    CurrencyService,
    CreditCardService,
    LocationService,
    ConfigurationProviderService,
    {
      provide: "LockRepo",
      useClass: MongoDBLockRepo,
    },
    LockService,
    EllipticService,
    {
      provide: "CreditCardBinDataRepo",
      useClass: MongoDBCreditCardBinDataRepo,
    },
    {
      provide: "OTPRepo",
      useClass: SQLOTPRepo,
    },
    OTPService,
  ],
  exports: [
    CsvService,
    SMSService,
    KmsService,
    CurrencyService,
    CreditCardService,
    LocationService,
    ConfigurationProviderService,
    LockService,
    EllipticService,
    OTPService,
  ],
})
export class CommonModule {}
