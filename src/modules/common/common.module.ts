import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailService } from "./email.service";
import { StripeService } from "./stripe.service";
import { Web3ProviderService } from "./web3providers.service";


@Module({
    imports: [ConfigModule],
    providers: [ StripeService, Web3ProviderService, EmailService ],
    exports: [ StripeService, Web3ProviderService, EmailService ]
  })
export class CommonModule{}