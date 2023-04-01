import { Module } from "@nestjs/common";
import { MonoModule } from "../../../modules/psp/mono/mono.module";
import { CommonModule } from "../../../modules/common/common.module";
import { BankFactory } from "./bank.factory";
import { CircleService } from "../circle/circle.service";
import { CircleRepoModule } from "../circle/repos/circle.repo.module";
import { CircleClient } from "../circle/circle.client";

@Module({
  imports: [MonoModule, CommonModule, CircleRepoModule, MonoModule],
  providers: [BankFactory, CircleService, CircleClient],
  exports: [BankFactory],
})
export class BankFactoryModule {}
