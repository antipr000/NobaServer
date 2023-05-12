import { Module } from "@nestjs/common";
import { ExchangeRateModule } from "../../../modules/exchangerate/exchangerate.module";
import { EmployerModule } from "../../../modules/employer/employer.module";
import { CommonModule } from "../../common/common.module";
import { CirclePublicModule } from "../public/circle.public.module";
import { CircleRepoModule } from "../repos/circle.repo.module";
import { CircleWorkflowController } from "./circle.workflow.controller";
import { CircleWorkflowService } from "./circle.workflow.service";

@Module({
  imports: [CircleRepoModule, CommonModule, CirclePublicModule, EmployerModule, ExchangeRateModule],
  controllers: [CircleWorkflowController],
  providers: [CircleWorkflowService],
  exports: [],
})
export class CircleWorkflowModule {}
