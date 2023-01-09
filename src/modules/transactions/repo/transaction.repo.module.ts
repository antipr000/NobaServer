import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MongoDBTransactionRepo } from "./MongoDBTransactionRepo";
import { SQLLimitConfigurationRepo } from "../../transaction/repo/sql.limitconfiguration.repo";
import { SQLLimitProfileRepo } from "../../transaction/repo/sql.limitprofile.repo";

const TransactionRepoProvider = {
  provide: "TransactionRepo",
  useClass: MongoDBTransactionRepo,
};

const LimitProfileRepoProvider = {
  provide: "LimitProfileRepo",
  useClass: SQLLimitProfileRepo,
};

const LimitConfigurationRepoProvider = {
  provide: "LimitConfigurationRepo",
  useClass: SQLLimitConfigurationRepo,
};

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [TransactionRepoProvider, LimitConfigurationRepoProvider, LimitProfileRepoProvider],
  exports: [TransactionRepoProvider, LimitConfigurationRepoProvider, LimitProfileRepoProvider], //Need to access in PublicController
})
export class TransactionRepoModule {}
