import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailService } from "./email.service";
import { StripeService } from "./stripe.service";
import { EthereumWeb3ProviderService, TerraWeb3ProviderService } from "./web3providers.service";


@Module({
    imports: [ConfigModule],
    providers: [ StripeService, EthereumWeb3ProviderService, TerraWeb3ProviderService, EmailService ],
    exports: [ StripeService, EthereumWeb3ProviderService, TerraWeb3ProviderService, EmailService ]
  })
export class CommonModule{}