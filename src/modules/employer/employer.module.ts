import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { S3Service } from "../common/s3.service";
import { EmployerController } from "./employer.controller";
import { EmployerService } from "./employer.service";
import { PayrollRepoModule } from "./repo/payroll.repo.module";
import { EmployerRepoModule } from "./repo/employer.repo.module";
import { EmployeeModule } from "../employee/employee.module";
import { CommonModule } from "../common/common.module";
import { EmployerWorkflowController } from "./employer.workflow.controller";
import { ConsumerModule } from "../consumer/consumer.module";
import { PayrollWorkflowController } from "./payroll.workflow.controller";
import { TemporalModule } from "../../infra/temporal/temporal.module";
import { ExchangeRateModule } from "../exchangerate/exchangerate.module";

@Module({
  imports: [
    InfraProvidersModule,
    EmployerRepoModule,
    EmployeeModule,
    CommonModule,
    PayrollRepoModule,
    ConsumerModule,
    TemporalModule,
    ExchangeRateModule,
  ],
  controllers: [EmployerController, EmployerWorkflowController, PayrollWorkflowController],
  providers: [EmployerService, S3Service],
  exports: [EmployerService],
})
export class EmployerModule {}
