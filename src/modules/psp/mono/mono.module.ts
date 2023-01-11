import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { MonoRepoModule } from "./repo/mono.repo.module";


@Module({
  imports: [InfraProvidersModule, MonoRepoModule],
  controllers: [],
  providers: [],
  exports: [],  //Need to access in PublicController
})
export class MonoModule { }
