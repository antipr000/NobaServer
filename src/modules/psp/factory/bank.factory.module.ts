import { Module } from "@nestjs/common";
import { CommonModule } from "../../../modules/common/common.module";
import { BankFactory } from "./bank.factory";
import { CircleRepoModule } from "../../circle/repos/circle.repo.module";
import { CirclePublicModule } from "../../../modules/circle/public/circle.public.module";
import { MonoPublicModule } from "../../../modules/mono/public/mono.public.module";

@Module({
  imports: [CommonModule, CircleRepoModule, CirclePublicModule, MonoPublicModule],
  providers: [BankFactory],
  exports: [BankFactory],
})
export class BankFactoryModule {}
