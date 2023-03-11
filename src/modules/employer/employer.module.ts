import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { TemplateService } from "../common/template.service";
import { EmployerController } from "./employer.controller";
import { EmployerService } from "./employer.service";
import { PayrollRepoModule } from "./repo/payroll.repo.module";
import { EmployerRepoModule } from "./repo/employer.repo.module";
import { EmployeeModule } from "../employee/employee.module";
import { CommonModule } from "../common/common.module";
import { EmployerWorkflowController } from "./employer.workflow.controller";
import { DeprecatedPayrollWorkflowController } from "./deprecated.payroll.workflow.controller";
import { ConsumerModule } from "../consumer/consumer.module";
import { PayrollWorkflowController } from "./payroll.workflow.controller";

@Module({
  imports: [InfraProvidersModule, EmployerRepoModule, EmployeeModule, CommonModule, PayrollRepoModule, ConsumerModule],
  controllers: [
    EmployerController,
    EmployerWorkflowController,
    PayrollWorkflowController,
    DeprecatedPayrollWorkflowController,
  ],
  providers: [EmployerService, TemplateService],
  exports: [EmployerService],
})
export class EmployerModule {}
