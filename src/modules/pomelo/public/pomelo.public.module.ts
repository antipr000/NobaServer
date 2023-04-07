import { Module } from "@nestjs/common";
import { PomeloClient } from "../public/pomelo.client";
import { PomeloService } from "../public/pomelo.service";
import { CommonModule } from "../../common/common.module";
import { ConsumerModule } from "../../consumer/consumer.module";
import { PomeloRepoModule } from "../repos/pomelo.repo.module";

@Module({
  imports: [PomeloRepoModule, CommonModule, ConsumerModule],
  controllers: [],
  providers: [PomeloClient, PomeloService],
  exports: [PomeloService],
})
export class PomeloPublicModule {}
