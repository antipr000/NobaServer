import { Module } from "@nestjs/common";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MonoClient } from "./mono.client";
import { MonoService } from "./mono.service";
import { MonoRepoModule } from "./repo/mono.repo.module";
import { MonoWebhookHandlers } from "./mono.webhook";

@Module({
  imports: [InfraProvidersModule, MonoRepoModule, ConsumerModule],
  controllers: [],
  providers: [MonoClient, MonoService, MonoWebhookHandlers],
  exports: [MonoService], //Need to access in PublicController
})
export class MonoModule {}
