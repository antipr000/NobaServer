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
import { ValidatePendingTransactionProcessor } from "./queueprocessors/ValidatePendingTransactionProcessor";
import { FiatReversalInitiator } from "./queueprocessors/FiatReversalInitiator";
import { FiatTransactionStatusProcessor } from "./queueprocessors/FiatTransactionStatusProcessor";
import { CryptoTransactionInitiator } from "./queueprocessors/CryptoTransactionInitiator";
import { CryptoTransactionStatusProcessor } from "./queueprocessors/CryptoTransactionStatusProcessor";
import { TransactionCompletedProcessor } from "./queueprocessors/TransactionCompletedProcessor";

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
    CryptoTransactionInitiator,
    CryptoTransactionStatusProcessor,
    FiatReversalInitiator,
    //FiatReversalStatusProcessor,
    FiatTransactionInitiator,
    FiatTransactionStatusProcessor,
    TransactionCompletedProcessor,
    //TransactionFailedProcessor,
    ValidatePendingTransactionProcessor,
    {
      provide: "TransactionRepo",
      useClass: MongoDBTransactionRepo,
    },
  ],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
