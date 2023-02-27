import { Module } from "@nestjs/common";
import { MonoModule } from "../../../modules/psp/mono/mono.module";
import { PspModule } from "../../../modules/psp/psp.module";
import { CommonModule } from "../../../modules/common/common.module";
import { BankFactory } from "./bank.factory";
import { BankMonoImpl } from "./bank.mono.impl";
import { BankCircleImpl } from "./bank.circle.impl";
import { CircleService } from "../circle.service";
import { CircleRepoModule } from "../repos/circle.repo.module";
import { CircleClient } from "../circle.client";

@Module({
  imports: [MonoModule, CommonModule, CircleRepoModule],
  providers: [BankFactory, BankMonoImpl, BankCircleImpl, CircleService, CircleClient],
  exports: [BankFactory],
})
export class BankFactoryModule {}
