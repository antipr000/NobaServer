import { Module } from "@nestjs/common";
import { EmployerModule } from "../../../modules/employer/employer.module";
import { CommonModule } from "../../common/common.module";
import { CirclePublicModule } from "../public/circle.public.module";
import { CircleRepoModule } from "../repos/circle.repo.module";
import { CircleWorkflowController } from "./circle.workflow.controller";

@Module({
  imports: [CircleRepoModule, CommonModule, CirclePublicModule, EmployerModule],
  controllers: [CircleWorkflowController],
  providers: [],
  exports: [],
})
export class CircleWorkflowModule {}
