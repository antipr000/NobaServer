import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { TransactionRepoModule } from "./repo/transaction.repo.module";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { ConsumerModule } from "../consumer/consumer.module";

@Module({
  imports: [InfraProvidersModule, TransactionRepoModule, ConsumerModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
