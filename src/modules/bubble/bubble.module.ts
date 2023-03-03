import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EmployeeModule } from "../employee/employee.module";
import { EmployerModule } from "../employer/employer.module";
import { BubbleClient } from "./bubble.client";
import { BubbleWebhookController } from "./bubble.webhook.controller";
import { BubbleService } from "./bubble.service";

@Module({
  imports: [InfraProvidersModule, EmployeeModule, EmployerModule],
  controllers: [BubbleWebhookController],
  providers: [BubbleClient, BubbleService],
  exports: [BubbleService],
})
export class BubbleModule {}
