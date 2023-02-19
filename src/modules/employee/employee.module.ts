import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EmployeeService } from "./employee.service";
import { EmployeeRepoModule } from "./repo/employee.repo.module";
import { EmployerModule } from "../employer/employer.module";

@Module({
  imports: [InfraProvidersModule, EmployeeRepoModule, EmployerModule],
  controllers: [],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
