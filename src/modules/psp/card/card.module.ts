import { Module } from "@nestjs/common";
import { CardProviderModule } from "./providers/card.provider.module";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { CardService } from "./card.service";

@Module({
  imports: [CardProviderModule, ConsumerModule],
  controllers: [],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
