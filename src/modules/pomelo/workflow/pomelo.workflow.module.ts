import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { ConsumerModule } from "../../consumer/consumer.module";
import { PomeloRepoModule } from "../repos/pomelo.repo.module";
import { TransactionModule } from "../../transaction/transaction.module";
import { PomeloWorkflowController } from "./pomelo.workflow.controller";
import { PomeloPublicModule } from "../public/pomelo.public.module";
import { PomeloWorkflowService } from "./pomelo.workflow.service";
import { PomeloWorkflowMapper } from "./pomelo.workflow.mapper";

@Module({
  imports: [PomeloRepoModule, PomeloPublicModule, CommonModule, ConsumerModule, TransactionModule],
  controllers: [PomeloWorkflowController],
  providers: [PomeloWorkflowService, PomeloWorkflowMapper],
  exports: [],
})
export class PomeloWorkflowModule {}
