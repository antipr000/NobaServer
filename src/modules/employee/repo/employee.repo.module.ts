import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SqlEmployeeRepo } from "./sql.employee.repo";
import { CommonModule } from "../../../modules/common/common.module";

export const EMPLOYEE_REPO_PROVIDER = "EMPLOYEE_REPO";

@Module({
  imports: [InfraProvidersModule, CommonModule],
  controllers: [],
  providers: [
    {
      provide: EMPLOYEE_REPO_PROVIDER,
      useClass: SqlEmployeeRepo,
    },
  ],
  exports: [EMPLOYEE_REPO_PROVIDER],
})
export class EmployeeRepoModule {}
