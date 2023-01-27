import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EmployeeModule } from "../employee/employee.module";
import { EmployerModule } from "../employer/employer.module";
import { BubbleClient } from "./bubble.client";
import { BubbleWorkflowController } from "./bubble.workflow.controller";
import { BubbleService } from "./bubble.service";

@Module({
  imports: [InfraProvidersModule, EmployeeModule, EmployerModule],
  controllers: [BubbleWorkflowController],
  providers: [BubbleClient, BubbleService],
  exports: [BubbleService],
})
export class BubbleModule {}
