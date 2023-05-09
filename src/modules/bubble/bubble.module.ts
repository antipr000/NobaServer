import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EmployeeModule } from "../employee/employee.module";
import { EmployerModule } from "../employer/employer.module";
import { BubbleWebhookController } from "./bubble.webhook.controller";
import { BubbleService } from "./bubble.service";
import { TemporalModule } from "../../infra/temporal/temporal.module";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [InfraProvidersModule, EmployeeModule, EmployerModule, TemporalModule, CommonModule],
  controllers: [BubbleWebhookController],
  providers: [BubbleService],
  exports: [BubbleService],
})
export class BubbleModule {}
