import { Module } from "@nestjs/common";
import { CardProviderModule } from "./providers/card.provider.module";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { CardService } from "./card.service";
import { NobaCardRepoModule } from "./repos/card.repo.module";

@Module({
  imports: [CardProviderModule, ConsumerModule, NobaCardRepoModule],
  controllers: [],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
