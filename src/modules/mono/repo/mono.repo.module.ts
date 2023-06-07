import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { SqlMonoRepo } from "./sql.mono.repo";
import { CommonModule } from "../../../modules/common/common.module";

export const MONO_REPO_PROVIDER = "MONO_REPO";

@Module({
  imports: [InfraProvidersModule, CommonModule],
  controllers: [],
  providers: [
    {
      provide: MONO_REPO_PROVIDER,
      useClass: SqlMonoRepo,
    },
  ],
  exports: [MONO_REPO_PROVIDER],
})
export class MonoRepoModule {}
