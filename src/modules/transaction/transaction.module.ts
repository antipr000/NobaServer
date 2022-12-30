import { Module } from "@nestjs/common";
import { WorkflowExecutor } from "src/infra/temporal/workflow.executor";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";

@Module({
  imports: [InfraProvidersModule],
  controllers: [TransactionController],
  providers: [TransactionService, WorkflowExecutor],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
