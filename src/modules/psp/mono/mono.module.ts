import { Module } from "@nestjs/common";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MonoClient } from "./mono.client";
import { MonoService } from "./mono.service";
import { MonoRepoModule } from "./repo/mono.repo.module";
import { MonoWebhookHandlers } from "./mono.webhook";
import { MonoWorkflowController } from "./mono.workflow.controller";
import { MonoWorkflowControllerMappers } from "./mono.workflow.controller.mappers";
import { CommonModule } from "../../../modules/common/common.module";
import { MonoWorkflowService } from "./mono.workflow.service";

@Module({
  imports: [InfraProvidersModule, MonoRepoModule, ConsumerModule, CommonModule],
  controllers: [MonoWorkflowController],
  providers: [MonoClient, MonoService, MonoWorkflowService, MonoWebhookHandlers, MonoWorkflowControllerMappers],
  exports: [MonoService, MonoWorkflowService],
})
export class MonoModule {}
