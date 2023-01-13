import { Module } from "@nestjs/common";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MonoClient } from "./mono.client";
import { MonoService } from "./mono.service";
import { MonoRepoModule } from "./repo/mono.repo.module";
import { MonoWebhookHandlers } from "./mono.webhook";
import { MonoWorkflowController } from "./mono.workflow.controller";
import { MonoWorkflowControllerMappers } from "./mono.workflow.controller.mappers";

@Module({
  imports: [InfraProvidersModule, MonoRepoModule, ConsumerModule],
  controllers: [MonoWorkflowController],
  providers: [MonoClient, MonoService, MonoWebhookHandlers, MonoWorkflowControllerMappers],
  exports: [MonoService],
})
export class MonoModule {}
