import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MonoClient } from "./mono.client";
import { MonoService } from "./mono.service";
import { MonoRepoModule } from "./repo/mono.repo.module";

@Module({
  imports: [InfraProvidersModule, MonoRepoModule],
  controllers: [],
  providers: [MonoClient, MonoService],
  exports: [MonoService], //Need to access in PublicController
})
export class MonoModule {}
