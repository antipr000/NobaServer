import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { ConsumerModule } from "../consumer/consumer.module";
import { VerificationModule } from "../verification/verification.module";
import { PendingTransactionDBPollerService } from "./crons/PendingTransactionsDBPoller.cron";
import { LimitsService } from "./limits.service";
import { MongoDBTransactionRepo } from "./repo/MongoDBTransactionRepo";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { ZeroHashService } from "./zerohash.service";
import { AppService } from "../../app.service";
import { AsyncTransactionProcessorModule } from "./queueprocessors/processors.module";
import { SqsClient } from "./queueprocessors/sqs.client";
import { TransactionPollerService } from "./crons/transaction.poller.cron";

@Module({
  imports: [InfraProvidersModule, CommonModule, ConsumerModule, VerificationModule, AsyncTransactionProcessorModule],
  controllers: [TransactionController],
  providers: [
    SqsClient,
    // PendingTransactionDBPollerService,
    TransactionPollerService,
    TransactionService,
    LimitsService,
    ZeroHashService,
    AppService, // Replace with 'CurrencyService'
    {
      provide: "TransactionRepo",
      useClass: MongoDBTransactionRepo,
    },
  ],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
