import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { TemplateService } from "../common/template.service";
import { EmployerController } from "./employer.controller";
import { EmployerService } from "./employer.service";
import { PayrollRepoModule } from "./repo/payroll.repo.module";
import { EmployerRepoModule } from "./repo/employer.repo.module";
import { EmployeeModule } from "../employee/employee.module";

@Module({
  imports: [InfraProvidersModule, EmployerRepoModule, EmployeeModule, PayrollRepoModule],
  controllers: [EmployerController],
  providers: [EmployerService, TemplateService],
  exports: [EmployerService],
})
export class EmployerModule {}
