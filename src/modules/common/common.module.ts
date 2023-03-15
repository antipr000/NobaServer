import { Module } from "@nestjs/common";
import {} from "aws-sdk";
import { CsvService } from "./csv.service";
import { CreditCardService } from "./creditcard.service";
import { CurrencyService } from "./currency.service";
import { LocationService } from "./location.service";
import { KmsService } from "./kms.service";
import { ConfigurationProviderService } from "./configuration.provider.service";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EllipticService } from "./elliptic.service";
import { SQLCreditCardBinDataRepo } from "./repo/sql.creditcardbindata.repo";
import { SQLOTPRepo } from "./repo/sql.otp.repo";
import { OTPService } from "./otp.service";
import { DeleteExpiredOTPs } from "../auth/DeleteExpiredOTPs";
import { QRService } from "./qrcode.service";
import { SQLExchangeRateRepo } from "./repo/sql.exchangerate.repo";
import { ExchangeRateService } from "./exchangerate.service";
import { S3Service } from "./s3.service";
import { AlertService } from "./alerts/alert.service";

@Module({
  imports: [InfraProvidersModule],
  providers: [
    CsvService,
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
    QRService,
    S3Service,
    AlertService,
  ],
  exports: [
    CsvService,
    KmsService,
    CurrencyService,
    ExchangeRateService,
    CreditCardService,
    LocationService,
    ConfigurationProviderService,
    EllipticService,
    OTPService,
    QRService,
    S3Service,
    AlertService,
  ],
})
export class CommonModule {}
