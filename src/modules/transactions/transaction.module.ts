import { Module } from "@nestjs/common";
import { DBProvider } from "../../infraproviders/DBProvider";
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
import { FiatTransactionInitiator } from "./queueprocessors/FiatTransactionInitiator";
import { ValidatePendingTransactionProcessor } from "./queueprocessors/ValidatePendingTransactionProcessor";
import { FiatReversalInitiator } from "./queueprocessors/FiatReversalInitiator";
import { FiatTransactionStatusProcessor } from "./queueprocessors/FiatTransactionStatusProcessor";
import { CryptoTransactionInitiator } from "./queueprocessors/CryptoTransactionInitiator";
import { CryptoTransactionStatusProcessor } from "./queueprocessors/CryptoTransactionStatusProcessor";
import { TransactionCompletedProcessor } from "./queueprocessors/TransactionCompletedProcessor";
import { OnChainPendingProcessor } from "./queueprocessors/OnChainPendingProcessor";
import { TransactionFailedProcessor } from "./queueprocessors/TransactionFailedProcessor";

@Module({
  imports: [InfraProvidersModule, CommonModule, ConsumerModule, VerificationModule],
  controllers: [TransactionController],
  providers: [
    PendingTransactionDBPollerService,
    TransactionService,
    DBProvider,
    LimitsService,
    ZeroHashService,
    AppService,
    {
      provide: "TransactionRepo",
      useClass: MongoDBTransactionRepo,
    },
    // All the queue processors
    CryptoTransactionInitiator,
    CryptoTransactionStatusProcessor,
    FiatReversalInitiator,
    //FiatReversalStatusProcessor,
    FiatTransactionInitiator,
    FiatTransactionStatusProcessor,
    TransactionCompletedProcessor,
    TransactionFailedProcessor,
    ValidatePendingTransactionProcessor,
    OnChainPendingProcessor,
  ],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
