import { Module } from "@nestjs/common";
import { ConsumerModule } from "../../consumer/consumer.module";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { CommonModule } from "../../common/common.module";
import { MonoPublicModule } from "../public/mono.public.module";
import { MonoWorkflowController } from "./mono.workflow.controller";
import { MonoWorkflowControllerMappers } from "./mono.workflow.controller.mappers";
import { MonoRepoModule } from "../repo/mono.repo.module";
import { MonoWorkflowService } from "./mono.workflow.service";

@Module({
  imports: [InfraProvidersModule, ConsumerModule, CommonModule, MonoPublicModule, MonoRepoModule],
  controllers: [MonoWorkflowController],
  providers: [MonoWorkflowControllerMappers, MonoWorkflowService],
  exports: [],
})
export class MonoWorkflowModule {}
