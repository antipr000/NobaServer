import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SqlPayrollRepo } from "./sql.payroll.repo";
import { SqlPayrollDisbursementRepo } from "./sql.payroll.disbursement.repo";

export const PAYROLL_REPO_PROVIDER = "PAYROLL_REPO";
export const PAYROLL_DISBURSEMENT_REPO_PROVIDER = "PAYROLL_DISBURSEMENT_REPO";
@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [
    {
      provide: PAYROLL_REPO_PROVIDER,
      useClass: SqlPayrollRepo,
    },
    {
      provide: PAYROLL_DISBURSEMENT_REPO_PROVIDER,
      useClass: SqlPayrollDisbursementRepo,
    },
  ],
  exports: [PAYROLL_REPO_PROVIDER, PAYROLL_DISBURSEMENT_REPO_PROVIDER],
})
export class PayrollRepoModule {}
