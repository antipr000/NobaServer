import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { TemplateService } from "../common/template.service";
import { EmployerController } from "./employer.controller";
import { EmployerService } from "./employer.service";
import { PayrollRepoModule } from "./payroll/repo/payroll.repo.module";
import { EmployerRepoModule } from "./repo/employer.repo.module";

@Module({
  imports: [InfraProvidersModule, EmployerRepoModule, PayrollRepoModule, CommonModule],
  controllers: [EmployerController],
  providers: [EmployerService, TemplateService],
  exports: [EmployerService],
})
export class EmployerModule {}
