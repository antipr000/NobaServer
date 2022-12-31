import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { TransactionRepoModule } from "./repo/transaction.repo.module";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";

@Module({
  imports: [InfraProvidersModule, TransactionRepoModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
