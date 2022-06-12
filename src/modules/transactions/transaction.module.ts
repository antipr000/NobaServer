import { Module } from "@nestjs/common";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { ConfigModule } from "@nestjs/config";
import { ExchangeRateController } from "./exchangerate.controller";
import { ExchangeRateService } from "./exchangerate.service";
import { CommonModule } from "../common/common.module";
import { LimitsService } from "./limits.service";
import { UserModule } from "../user/user.module";
import { EthereumWeb3ProviderService, TerraWeb3ProviderService } from "../common/web3providers.service";

@Module({
  imports: [InfraProvidersModule, ConfigModule, CommonModule, UserModule],
  controllers: [TransactionController, ExchangeRateController],
  providers: [
    TransactionService,
    DBProvider,
    ExchangeRateService,
    LimitsService,
    EthereumWeb3ProviderService,
    TerraWeb3ProviderService,
  ],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
