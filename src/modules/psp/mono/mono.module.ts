import { Module } from "@nestjs/common";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MonoClient } from "./mono.client";
import { MonoService } from "./mono.service";
import { MonoRepoModule } from "./repo/mono.repo.module";

@Module({
  imports: [InfraProvidersModule, MonoRepoModule, ConsumerModule],
  controllers: [],
  providers: [MonoClient, MonoService],
  exports: [MonoService], //Need to access in PublicController
})
export class MonoModule {}
