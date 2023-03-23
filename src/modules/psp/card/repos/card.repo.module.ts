import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../../../infraproviders/infra.module";
import { SQLNobaCardRepo } from "./sql.card.repo";

export const NOBA_CARD_REPO_PROVIDER = "NOBA_CARD_REPO";

@Module({
  imports: [InfraProvidersModule],
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
