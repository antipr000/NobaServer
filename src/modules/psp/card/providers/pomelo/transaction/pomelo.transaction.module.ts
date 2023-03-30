import { Module } from "@nestjs/common";
import { PomeloClient } from "../pomelo.client";
import { PomeloService } from "../pomelo.service";
import { CommonModule } from "../../../../../common/common.module";
import { PomeloWebhookMapper } from "./pomelo.webhook.mapper";
import { PomeloTransactionService } from "./pomelo.transaction.service";
import { PomeloTransactionWebhookController } from "./pomelo.webhook.controller";
import { ConsumerModule } from "../../../../../../modules/consumer/consumer.module";
import { PomeloRepoModule } from "../repos/pomelo.repo.module";

@Module({
  imports: [PomeloRepoModule, CommonModule, ConsumerModule],
  controllers: [PomeloTransactionWebhookController],
  providers: [PomeloClient, PomeloService, PomeloWebhookMapper, PomeloTransactionService],
  exports: [],
})
export class PomeloTransactionProcessorModule {}
