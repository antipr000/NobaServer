import { Module } from "@nestjs/common";
import { MonoModule } from "../../../modules/psp/mono/mono.module";
import { PspModule } from "../../../modules/psp/psp.module";
import { CommonModule } from "../../../modules/common/common.module";
import { BalanceProviderFactory } from "./balanceprovider.factory";
import { MonoBalanceProviderImpl } from "./mono.balanceprovider.impl";

@Module({
  imports: [PspModule, MonoModule, CommonModule],
  providers: [BalanceProviderFactory, MonoBalanceProviderImpl],
  exports: [BalanceProviderFactory],
})
export class BalanceProviderFactoryModule {}
