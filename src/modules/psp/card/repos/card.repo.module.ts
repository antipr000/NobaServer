import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../../infraproviders/infra.module";
import { SQLNobaCardRepo } from "./sql.card.repo";
import { CommonModule } from "../../../../modules/common/common.module";

export const NOBA_CARD_REPO_PROVIDER = "NOBA_CARD_REPO";

@Module({
  imports: [InfraProvidersModule, CommonModule],
  controllers: [],
  providers: [
    {
      provide: NOBA_CARD_REPO_PROVIDER,
      useClass: SQLNobaCardRepo,
    },
  ],
  exports: [NOBA_CARD_REPO_PROVIDER],
})
export class NobaCardRepoModule {}
