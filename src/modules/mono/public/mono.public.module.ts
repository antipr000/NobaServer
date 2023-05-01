import { Module } from "@nestjs/common";
import { ConsumerModule } from "../../consumer/consumer.module";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MonoClient } from "./mono.client";
import { MonoService } from "./mono.service";
import { MonoRepoModule } from "../repo/mono.repo.module";
import { CommonModule } from "../../common/common.module";

@Module({
  imports: [InfraProvidersModule, MonoRepoModule, ConsumerModule, CommonModule],
  controllers: [],
  providers: [MonoClient, MonoService],
  exports: [MonoService],
})
export class MonoPublicModule {}
