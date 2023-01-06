import { Module } from "@nestjs/common";
import {} from "aws-sdk";
import { CsvService } from "./csv.service";
import { CreditCardService } from "./creditcard.service";
import { CurrencyService } from "./currency.service";
import { LocationService } from "./location.service";
import { KmsService } from "./kms.service";
import { SMSService } from "./sms.service";
import { ConfigurationProviderService } from "./configuration.provider.service";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EllipticService } from "./elliptic.service";
import { SQLCreditCardBinDataRepo } from "./repo/SQLCreditCardBinDataRepo";
import { SQLOTPRepo } from "./repo/SQLOTPRepo";
import { OTPService } from "./otp.service";
import { DeleteExpiredOTPs } from "../auth/DeleteExpiredOTPs";
import { SQLExchangeRateRepo } from "./repo/sql.exchangerate.repo";
import { ExchangeRateService } from "./exchangerate.service";

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
    ExchangeRateService,
    ConfigurationProviderService,
    EllipticService,
    {
      provide: "CreditCardBinDataRepo",
      useClass: SQLCreditCardBinDataRepo,
    },
    {
      provide: "OTPRepo",
      useClass: SQLOTPRepo,
    },
    {
      provide: "ExchangeRateRepo",
      useClass: SQLExchangeRateRepo,
    },
    OTPService,
    DeleteExpiredOTPs,
  ],
  exports: [
    CsvService,
    SMSService,
    KmsService,
    CurrencyService,
    ExchangeRateService,
    CreditCardService,
    LocationService,
    ConfigurationProviderService,
    EllipticService,
    OTPService,
  ],
})
export class CommonModule {}
