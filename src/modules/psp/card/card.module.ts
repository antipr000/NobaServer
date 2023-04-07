import { Module } from "@nestjs/common";
import { CardProviderModule } from "./providers/card.provider.module";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { CardService } from "./card.service";
import { NobaCardRepoModule } from "./repos/card.repo.module";
import { CardController } from "./card.controller";

@Module({
  imports: [CardProviderModule, ConsumerModule, NobaCardRepoModule],
  controllers: [CardController],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
