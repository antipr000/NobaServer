import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailService } from "./email.service";
import { SMSService } from "./sms.service";
import { StripeService } from "./stripe.service";
import { EthereumWeb3ProviderService, TerraWeb3ProviderService } from "./web3providers.service";


@Module({
    imports: [ConfigModule],
    providers: [ StripeService, EthereumWeb3ProviderService, TerraWeb3ProviderService, EmailService, SMSService ],
    exports: [ StripeService, EthereumWeb3ProviderService, TerraWeb3ProviderService, EmailService, SMSService ]
  })
export class CommonModule{}