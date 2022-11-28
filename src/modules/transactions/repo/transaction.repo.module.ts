import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MongoDBLimitConfigurationRepo } from "./MongoDBLimitConfigurationRepo";
import { MongoDBLimitProfileRepo } from "./MongoDBLimitProfileRepo";
import { MongoDBTransactionRepo } from "./MongoDBTransactionRepo";

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  exports: [
    {
      provide: "TransactionRepo",
      useClass: MongoDBTransactionRepo,
    },
    {
      provide: "LimitProfileRepo",
      useClass: MongoDBLimitProfileRepo,
    },
    {
      provide: "LimitConfigurationRepo",
      useClass: MongoDBLimitConfigurationRepo,
    },
  ], //Need to access in PublicController
})
export class TransactionRepoModule {}
