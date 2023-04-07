import { Module } from "@nestjs/common";
import { MonoModule } from "../../../modules/psp/mono/mono.module";
import { CommonModule } from "../../../modules/common/common.module";
import { BankFactory } from "./bank.factory";
import { CircleRepoModule } from "../../circle/repos/circle.repo.module";
import { CirclePublicModule } from "../../../modules/circle/public/circle.public.module";

@Module({
  imports: [MonoModule, CommonModule, CircleRepoModule, MonoModule, CirclePublicModule],
  providers: [BankFactory],
  exports: [BankFactory],
})
export class BankFactoryModule {}
