import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MongoDBTransactionRepo } from "./MongoDBTransactionRepo";

const transactionRepoModule = {
  provide: "TransactionRepo",
  useClass: MongoDBTransactionRepo,
};
@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [transactionRepoModule],
  exports: [transactionRepoModule], //Need to access in PublicController
})
export class TransactionRepoModule {}
