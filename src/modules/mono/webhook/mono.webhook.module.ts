import { Module } from "@nestjs/common";
import { ConsumerModule } from "../../consumer/consumer.module";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { CommonModule } from "../../common/common.module";
import { MonoWebhookMappers } from "./mono.webhook.mapper";
import { MonoPublicModule } from "../public/mono.public.module";
import { MonoWebhookController } from "./mono.webhook.controller";
import { MonoWebhookService } from "./mono.webhook.service";
import { MonoRepoModule } from "../repo/mono.repo.module";
import { EmployerModule } from "../../../modules/employer/employer.module";

@Module({
  imports: [InfraProvidersModule, ConsumerModule, CommonModule, MonoPublicModule, MonoRepoModule, EmployerModule],
  controllers: [MonoWebhookController],
  providers: [MonoWebhookMappers, MonoWebhookService],
  exports: [],
})
export class MonoWebhookModule {}
