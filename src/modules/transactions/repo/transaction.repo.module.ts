import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MongoDBTransactionRepo } from "./MongoDBTransactionRepo";

const TransactionRepoProvider = {
  provide: "TransactionRepo",
  useClass: MongoDBTransactionRepo,
};

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [TransactionRepoProvider],
  exports: [TransactionRepoProvider], //Need to access in PublicController
})
export class TransactionRepoModule {}