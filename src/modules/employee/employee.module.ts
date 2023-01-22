import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { EmployeeService } from "./employee.service";
import { EmployeeRepoModule } from "./repo/employee.repo.module";

@Module({
  imports: [InfraProvidersModule, EmployeeRepoModule],
  controllers: [],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
