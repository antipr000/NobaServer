import { Module } from "@nestjs/common";
import { MonoModule } from "../../../modules/psp/mono/mono.module";
import { CommonModule } from "../../../modules/common/common.module";
import { BankFactory } from "./bank.factory";
import { CircleService } from "../circle.service";
import { CircleRepoModule } from "../repos/circle.repo.module";
import { CircleClient } from "../circle.client";
import { MonoWorkflowService } from "../mono/mono.workflow.service";

@Module({
  imports: [MonoModule, CommonModule, CircleRepoModule],
  providers: [BankFactory, MonoWorkflowService, CircleService, CircleClient],
  exports: [BankFactory],
})
export class BankFactoryModule {}
