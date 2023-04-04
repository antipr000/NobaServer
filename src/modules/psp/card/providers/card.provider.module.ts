import { Module } from "@nestjs/common";
import { PomeloRepoModule } from "../../../pomelo/repos/pomelo.repo.module";
import { CommonModule } from "../../../common/common.module";
import { CardProviderFactory } from "./card.provider.factory";
import { ConsumerModule } from "../../../../modules/consumer/consumer.module";
import { PomeloPublicModule } from "src/modules/pomelo/public/pomelo.public.module";

@Module({
  imports: [PomeloRepoModule, CommonModule, ConsumerModule, PomeloPublicModule],
  controllers: [],
  providers: [CardProviderFactory],
  exports: [CardProviderFactory],
})
export class CardProviderModule {}
