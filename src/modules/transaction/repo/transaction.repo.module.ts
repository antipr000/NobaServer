import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLTransactionRepo } from "./sql.transaction.repo";
import { SQLLimitConfigurationRepo } from "./sql.limitconfiguration.repo";
import { SQLLimitProfileRepo } from "./sql.limitprofile.repo";
import { CommonModule } from "../../../modules/common/common.module";
import { SQLWithdrawalDetailsRepo } from "./sql.withdrawal.details.repo";

export const TRANSACTION_REPO_PROVIDER = "TRANSACTION_REPO";
export const LIMIT_CONFIGURATION_REPO_PROVIDER = "LIMIT_CONFIGURATION_REPO";
export const LIMIT_PROFILE_REPO_PROVIDER = "LIMIT_PROFILE_REPO";
export const WITHDRAWAL_DETAILS_REPO_PROVIDER = "WITHDRAWAL_DETAILS_REPO";

@Module({
  imports: [InfraProvidersModule, CommonModule],
  controllers: [],
  providers: [
    {
      provide: TRANSACTION_REPO_PROVIDER,
      useClass: SQLTransactionRepo,
    },
    {
      provide: LIMIT_CONFIGURATION_REPO_PROVIDER,
      useClass: SQLLimitConfigurationRepo,
    },
    {
      provide: LIMIT_PROFILE_REPO_PROVIDER,
      useClass: SQLLimitProfileRepo,
    },
    {
      provide: WITHDRAWAL_DETAILS_REPO_PROVIDER,
      useClass: SQLWithdrawalDetailsRepo,
    },
  ],
  exports: [
    TRANSACTION_REPO_PROVIDER,
    LIMIT_PROFILE_REPO_PROVIDER,
    LIMIT_CONFIGURATION_REPO_PROVIDER,
    WITHDRAWAL_DETAILS_REPO_PROVIDER,
  ],
})
export class TransactionRepoModule {}
