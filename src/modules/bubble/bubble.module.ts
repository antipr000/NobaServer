import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { ConsumerModule } from "../consumer/consumer.module";
import { EmployeeModule } from "../employee/employee.module";
import { EmployerModule } from "../employer/employer.module";
import { BubbleClient } from "./bubble.client";
import { BubbleService } from "./buuble.service";

@Module({
  imports: [InfraProvidersModule, EmployeeModule, ConsumerModule, EmployerModule],
  controllers: [],
  providers: [BubbleClient, BubbleService],
  exports: [BubbleService],
})
export class BubbleModule {}
