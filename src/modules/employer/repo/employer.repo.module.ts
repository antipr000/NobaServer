import { Module } from "@nestjs/common";
import { CommonModule } from "../../../modules/common/common.module";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SqlEmployerRepo } from "./sql.employer.repo";
import { SqlPayrollRepo } from "./sql.payroll.repo";
import { SqlPayrollDisbursementRepo } from "./sql.payroll.disbursement.repo";

export const EMPLOYER_REPO_PROVIDER = "EMPLOYER_REPO";
export const PAYROLL_REPO_PROVIDER = "PAYROLL_REPO";
export const PAYROLL_DISBURSEMENT_REPO_PROVIDER = "PAYROLL_DISBURSEMENT_REPO";

@Module({
  imports: [InfraProvidersModule, CommonModule],
  controllers: [],
  providers: [
    {
      provide: EMPLOYER_REPO_PROVIDER,
      useClass: SqlEmployerRepo,
    },
    {
      provide: PAYROLL_REPO_PROVIDER,
      useClass: SqlPayrollRepo,
    },
    {
      provide: PAYROLL_DISBURSEMENT_REPO_PROVIDER,
      useClass: SqlPayrollDisbursementRepo,
    },
  ],
  exports: [EMPLOYER_REPO_PROVIDER, PAYROLL_REPO_PROVIDER, PAYROLL_DISBURSEMENT_REPO_PROVIDER],
})
export class EmployerRepoModule {}
