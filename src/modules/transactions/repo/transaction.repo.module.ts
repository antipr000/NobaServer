import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MongoDBLimitConfigurationRepo } from "./MongoDBLimitConfigurationRepo";
import { MongoDBLimitProfileRepo } from "./MongoDBLimitProfileRepo";
import { MongoDBTransactionRepo } from "./MongoDBTransactionRepo";

const TransactionRepoProvider = {
  provide: "TransactionRepo",
  useClass: MongoDBTransactionRepo,
};

const LimitProfileRepoProvider = {
  provide: "LimitProfileRepo",
  useClass: MongoDBLimitProfileRepo,
};

const LimitConfigurationRepoProvider = {
  provide: "LimitConfigurationRepo",
  useClass: MongoDBLimitConfigurationRepo,
};

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [TransactionRepoProvider, LimitConfigurationRepoProvider, LimitProfileRepoProvider],
  exports: [TransactionRepoProvider, LimitConfigurationRepoProvider, LimitProfileRepoProvider], //Need to access in PublicController
})
export class TransactionRepoModule {}
