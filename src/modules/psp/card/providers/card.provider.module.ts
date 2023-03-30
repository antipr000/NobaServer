import { Module } from "@nestjs/common";
import { PomeloRepoModule } from "./pomelo/repos/pomelo.repo.module";
import { PomeloClient } from "./pomelo/pomelo.client";
import { PomeloService } from "./pomelo/pomelo.service";
import { CommonModule } from "../../../common/common.module";
import { CardProviderFactory } from "./card.provider.factory";
import { ConsumerModule } from "../../../../modules/consumer/consumer.module";
import { PomeloTransactionProcessorModule } from "./pomelo/transaction/pomelo.transaction.module";

@Module({
  imports: [PomeloRepoModule, CommonModule, ConsumerModule, PomeloTransactionProcessorModule],
  controllers: [],
  providers: [PomeloClient, PomeloService, CardProviderFactory],
  exports: [CardProviderFactory],
})
export class CardProviderModule {}
