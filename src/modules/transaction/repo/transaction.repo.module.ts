import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLTransactionRepo } from "./sql.transaction.repo";
import { SQLLimitConfigurationRepo } from "./sql.limit.configuration.repo";
import { SQLLimitProfileRepo } from "./sql.limit.profile.repo";

export const TRANSACTION_REPO_PROVIDER = "TRANSACTION_REPO";
export const LIMIT_CONFIGURATION_REPO_PROVIDER = "LIMIT_CONFIGURATION_REPO";
export const LIMIT_PROFILE_REPO_PROVIDER = "LIMIT_PROFILE_REPO";

@Module({
  imports: [InfraProvidersModule],
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
  ],
  exports: [TRANSACTION_REPO_PROVIDER, LIMIT_PROFILE_REPO_PROVIDER, LIMIT_CONFIGURATION_REPO_PROVIDER],
})
export class TransactionRepoModule {}
