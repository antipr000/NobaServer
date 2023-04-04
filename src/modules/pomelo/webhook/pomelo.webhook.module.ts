import { Module } from "@nestjs/common";
import { PomeloClient } from "../public/pomelo.client";
import { PomeloService } from "../public/pomelo.service";
import { CommonModule } from "../../common/common.module";
import { PomeloWebhookMapper } from "./pomelo.webhook.mapper";
import { PomeloTransactionService } from "./pomelo.webhook.service";
import { PomeloTransactionWebhookController } from "./pomelo.webhook.controller";
import { ConsumerModule } from "../../consumer/consumer.module";
import { PomeloRepoModule } from "../repos/pomelo.repo.module";
import { TransactionModule } from "../../transaction/transaction.module";
import { CirclePublicModule } from "../../../modules/circle/public/circle.public.module";

@Module({
  imports: [PomeloRepoModule, CommonModule, ConsumerModule, TransactionModule, CirclePublicModule],
  controllers: [PomeloTransactionWebhookController],
  providers: [PomeloClient, PomeloService, PomeloWebhookMapper, PomeloTransactionService],
  exports: [],
})
export class PomeloWebhooksModule {}
