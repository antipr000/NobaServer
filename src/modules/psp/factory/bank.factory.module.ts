import { Module } from "@nestjs/common";
import { MonoModule } from "../../../modules/psp/mono/mono.module";
import { PspModule } from "../../../modules/psp/psp.module";
import { CommonModule } from "../../../modules/common/common.module";
import { BankFactory } from "./bank.factory";
import { BankMonoImpl } from "./bank.mono.impl";

@Module({
  imports: [PspModule, MonoModule, CommonModule],
  providers: [BankFactory, BankMonoImpl],
  exports: [BankFactory],
})
export class BankFactoryModule {}
