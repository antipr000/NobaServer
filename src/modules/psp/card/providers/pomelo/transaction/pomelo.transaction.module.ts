import { Module } from "@nestjs/common";
import { PomeloClient } from "../pomelo.client";
import { PomeloService } from "../pomelo.service";
import { CommonModule } from "../../../../../common/common.module";
import { PomeloWebhookMapper } from "./pomelo.webhook.mapper";
import { PomeloTransactionService } from "./pomelo.transaction.service";
import { PomeloTransactionWebhookController } from "./pomelo.webhook.controller";
import { ConsumerModule } from "../../../../../../modules/consumer/consumer.module";
import { PomeloRepoModule } from "../repos/pomelo.repo.module";
import { TransactionModule } from "../../../../../../modules/transaction/transaction.module";
import { CircleService } from "../../../../../../modules/psp/circle.service";
import { CircleRepoModule } from "../../../../../../modules/psp/repos/circle.repo.module";
import { CircleClient } from "../../../../../../modules/psp/circle.client";

@Module({
  imports: [PomeloRepoModule, CommonModule, ConsumerModule, TransactionModule, CircleRepoModule],
  controllers: [PomeloTransactionWebhookController],
  providers: [PomeloClient, PomeloService, PomeloWebhookMapper, PomeloTransactionService, CircleService, CircleClient],
  exports: [],
})
export class PomeloTransactionProcessorModule {}
