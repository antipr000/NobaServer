import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SQLTransactionRepo } from "./sql.transaction.repo";

export const TRANSACTION_REPO_PROVIDER = "TRANSACTION_REPO";

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [
    {
      provide: TRANSACTION_REPO_PROVIDER,
      useClass: SQLTransactionRepo,
    },
  ],
  exports: [TRANSACTION_REPO_PROVIDER],
})
export class TransactionRepoModule {}
