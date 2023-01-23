import { Module } from "@nestjs/common";
import { WorkflowExecutor } from "../../infra/temporal/workflow.executor";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { TransactionRepoModule } from "./repo/transaction.repo.module";
import { TransactionController } from "./transaction.controller";
import { TransactionWorkflowController } from "./transaction.workflow.controller";
import { TransactionService } from "./transaction.service";
import { ConsumerModule } from "../consumer/consumer.module";
import { TemporalModule } from "../../infra/temporal/temporal.module";
import { LimitsService } from "./limits.service";
import { CommonModule } from "../common/common.module";
import { TRANSACTION_MAPPING_SERVICE_PROVIDER, TransactionMappingService } from "./mapper/transaction.mapper.service";
import { TransactionWorkflowMapper } from "./mapper/transaction.workflow.mapper";
import { VerificationModule } from "../verification/verification.module";
import { WorkflowFactoryModule } from "./factory/workflow.factory.module";
import { MonoModule } from "../psp/mono/mono.module";

@Module({
  imports: [
    InfraProvidersModule,
    TransactionRepoModule,
    VerificationModule,
    ConsumerModule,
    CommonModule,
    WorkflowFactoryModule,
    MonoModule,
  ],
  controllers: [TransactionController, TransactionWorkflowController],
  providers: [
    TransactionService,
    WorkflowExecutor,
    LimitsService,
    {
      provide: TRANSACTION_MAPPING_SERVICE_PROVIDER,
      useClass: TransactionMappingService,
    },
    TransactionWorkflowMapper,
  ],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}

@Module({
  imports: [
    InfraProvidersModule,
    TransactionRepoModule,
    ConsumerModule,
    TemporalModule,
    CommonModule,
    TransactionModule,
  ],
  providers: [TransactionWorkflowMapper],
  controllers: [TransactionWorkflowController],
})
export class TransactionWorkflowModule {}
