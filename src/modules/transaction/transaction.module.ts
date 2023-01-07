import { Module } from "@nestjs/common";
import { WorkflowExecutor } from "../../infra/temporal/workflow.executor";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { TransactionRepoModule } from "./repo/transaction.repo.module";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { ConsumerModule } from "../consumer/consumer.module";
import { TemporalModule } from "../../infra/temporal/temporal.module";

@Module({
  imports: [InfraProvidersModule, TransactionRepoModule, ConsumerModule, TemporalModule],
  controllers: [TransactionController],
  providers: [TransactionService, WorkflowExecutor],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
