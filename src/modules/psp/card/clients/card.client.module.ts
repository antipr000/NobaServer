import { Module } from "@nestjs/common";
import { PomeloRepoModule } from "./pomelo/repos/pomelo.repo.module";
import { PomeloClient } from "./pomelo/pomelo.client";
import { PomeloService } from "./pomelo/pomelo.service";
import { CommonModule } from "../../../common/common.module";
import { CardClientFactory } from "./card.client.factory";

@Module({
  imports: [PomeloRepoModule, CommonModule],
  controllers: [],
  providers: [PomeloClient, PomeloService, CardClientFactory],
  exports: [CardClientFactory],
})
export class CardClientModule {}
