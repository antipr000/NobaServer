import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../../../../infraproviders/infra.module";
import { SQLPomeloRepo } from "./sql.pomelo.repo";

export const POMELO_REPO_PROVIDER = "POMELO_REPO";

@Module({
  imports: [InfraProvidersModule],
  controllers: [],
  providers: [
    {
      provide: POMELO_REPO_PROVIDER,
      useClass: SQLPomeloRepo,
    },
  ],
  exports: [POMELO_REPO_PROVIDER],
})
export class PomeloRepoModule {}
