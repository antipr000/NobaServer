import { Module } from "@nestjs/common";
import { CardClientModule } from "./clients/card.client.module";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { CardService } from "./card.service";

@Module({
  imports: [CardClientModule, ConsumerModule],
  controllers: [],
  providers: [CardService],
  exports: [CardService],
})
export class CardModule {}
