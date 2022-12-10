import { Module } from "@nestjs/common";
import { getWinstonModule } from "../../../core/utils/WinstonModule";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";
import { CommonModule } from "../../../modules/common/common.module";
import { ConsumerModule } from "../../../modules/consumer/consumer.module";
import { VerificationModule } from "../../../modules/verification/verification.module";
import { AssetsModule } from "../assets/assets.module";
import { TransactionPollerService } from "../crons/transaction.poller.cron";
import { MongoDBTransactionRepo } from "../repo/MongoDBTransactionRepo";
import { TransactionService } from "../transaction.service";
import { ZeroHashService } from "../zerohash.service";
import { CryptoTransactionInitiator } from "./CryptoTransactionInitiator";
import { CryptoTransactionStatusProcessor } from "./CryptoTransactionStatusProcessor";
import { FiatTransactionInitiator } from "./FiatTransactionInitiator";
import { FiatTransactionStatusProcessor } from "./FiatTransactionStatusProcessor";
import { OnChainPendingProcessor } from "./OnChainPendingProcessor";
import { SqsClient } from "./sqs.client";
import { TransactionFailedProcessor } from "./TransactionFailedProcessor";
import { ValidatePendingTransactionProcessor } from "./ValidatePendingTransactionProcessor";
import { SanctionedCryptoWalletService } from "../../../modules/common/sanctionedcryptowallet.service";
import { NotificationsModule } from "../../../modules/notifications/notification.module";
import { PspModule } from "../../../modules/psp/psp.module";
import { TransactionRepoModule } from "../repo/transaction.repo.module";
import { LimitsService } from "../limits.service";
import { InternalTransferInitiator } from "./InternalTransferInitiator";
import { InternalTransferStatusProcessor } from "./InternalTransferStatusProcessor";

@Module({
  imports: [
    CommonModule,
    AssetsModule,
    InfraProvidersModule,
    ConsumerModule,
    VerificationModule,
    getWinstonModule(),
    NotificationsModule,
    PspModule,
    TransactionRepoModule,
  ],
  controllers: [],
  providers: [
    ZeroHashService,
    TransactionService,
    LimitsService,
    SqsClient,
    TransactionPollerService,
    SanctionedCryptoWalletService,
    {
      provide: "TransactionRepo",
      useClass: MongoDBTransactionRepo,
    },
    // Processors
    ValidatePendingTransactionProcessor,
    FiatTransactionInitiator,
    FiatTransactionStatusProcessor,
    CryptoTransactionInitiator,
    InternalTransferInitiator,
    InternalTransferStatusProcessor,
    CryptoTransactionStatusProcessor,
    OnChainPendingProcessor,
    TransactionFailedProcessor,
  ],
})
export class AsyncTransactionProcessorModule {}
