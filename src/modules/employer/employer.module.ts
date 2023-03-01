import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EmployerController } from "./employer.controller";
import { EmployerService } from "./employer.service";
import { PayrollRepoModule } from "./payroll/repo/payroll.repo.module";
import { EmployerRepoModule } from "./repo/employer.repo.module";

@Module({
  imports: [InfraProvidersModule, EmployerRepoModule, PayrollRepoModule],
  controllers: [EmployerController],
  providers: [EmployerService],
  exports: [EmployerService],
})
export class EmployerModule {}
