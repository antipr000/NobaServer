import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CsvService } from "./csv.service";
import { EmailService } from "./email.service";
import { SMSService } from "./sms.service";
import { StripeService } from "./stripe.service";
import { EthereumWeb3ProviderService, TerraWeb3ProviderService } from "./web3providers.service";

@Module({
  imports: [ConfigModule],
  providers: [
    CsvService,
    StripeService,
    EthereumWeb3ProviderService,
    TerraWeb3ProviderService,
    EmailService,
    SMSService,
  ],
  exports: [CsvService, StripeService, EthereumWeb3ProviderService, TerraWeb3ProviderService, EmailService, SMSService],
})
export class CommonModule {}
