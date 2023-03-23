import { Module } from "@nestjs/common";
import { PomeloRepoModule } from "./repos/pomelo.repo.module";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { PomeloClient } from "./pomelo.client";
import { PomeloService } from "./pomelo.service";
import { CommonModule } from "../../../modules/common/common.module";

@Module({
  imports: [PomeloRepoModule, ConsumerModule, CommonModule],
  controllers: [],
  providers: [
    PomeloClient,
    {
      provide: "CardService",
      useClass: PomeloService,
    },
  ],
  exports: [PomeloService],
})
export class PomeloModule {}
