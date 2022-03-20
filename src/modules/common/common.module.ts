import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { StripeService } from "./stripe.service";
import { Web3ProviderService } from "./web3providers.service";


@Module({
    imports: [ConfigModule],
    providers: [ StripeService, Web3ProviderService ],
    exports: [ StripeService, Web3ProviderService ]
  })
export class CommonModule{}