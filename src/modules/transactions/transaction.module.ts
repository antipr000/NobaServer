import { Module } from "@nestjs/common";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { ConsumerModule } from "../consumer/consumer.module";
import { VerificationModule } from "../verification/verification.module";
import { PendingTransactionDBPollerService } from "./crons/PendingTransactionsDBPoller.cron";
import { ExchangeRateController } from "./exchangerate.controller";
import { ExchangeRateService } from "./exchangerate.service";
import { LimitsService } from "./limits.service";
import { MongoDBTransactionRepo } from "./repo/MongoDBTransactionRepo";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { ZeroHashService } from "./zerohash.service";
import { AppService } from "../../app.service";
import { FiatTransactionInitiator } from "./queueprocessors/FiatTransactionInitiator";

@Module({
  imports: [InfraProvidersModule, CommonModule, ConsumerModule, VerificationModule],
  controllers: [TransactionController, ExchangeRateController],
  providers: [
    PendingTransactionDBPollerService,
    TransactionService,
    DBProvider,
    ExchangeRateService,
    LimitsService,
    ZeroHashService,
    AppService,
    {
      provide: "TransactionRepo",
      useClass: MongoDBTransactionRepo,
    },
    // All the queue processors
    FiatTransactionInitiator,
  ],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
