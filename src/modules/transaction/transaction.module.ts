import { Module } from "@nestjs/common";
import { WorkflowExecutor } from "../../infra/temporal/workflow.executor";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { TransactionRepoModule } from "./repo/transaction.repo.module";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { ConsumerModule } from "../consumer/consumer.module";
import { TemporalModule } from "../../infra/temporal/temporal.module";
import { LimitsService } from "./limits.service";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [InfraProvidersModule, TransactionRepoModule, ConsumerModule, TemporalModule, CommonModule],
  controllers: [TransactionController],
  providers: [TransactionService, WorkflowExecutor, LimitsService],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
