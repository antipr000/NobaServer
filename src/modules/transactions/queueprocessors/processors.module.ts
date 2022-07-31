import { Module } from "@nestjs/common";
import { AppService } from "src/app.service";
import { getWinstonModule } from "src/core/utils/WinstonModule";
import { InfraProvidersModule } from "src/infraproviders/infra.module";
import { CommonModule } from "src/modules/common/common.module";
import { ConsumerModule } from "src/modules/consumer/consumer.module";
import { VerificationModule } from "src/modules/verification/verification.module";
import { MongoDBTransactionRepo } from "../repo/MongoDBTransactionRepo";
import { TransactionService } from "../transaction.service";
import { ZeroHashService } from "../zerohash.service";
import { CryptoTransactionInitiator } from "./CryptoTransactionInitiator";
import { CryptoTransactionStatusProcessor } from "./CryptoTransactionStatusProcessor";
import { FiatTransactionInitiator } from "./FiatTransactionInitiator";
import { FiatTransactionStatusProcessor } from "./FiatTransactionStatusProcessor";
import { OnChainPendingProcessor } from "./OnChainPendingProcessor";
import { TransactionQueueName } from "./QueuesMeta";
import { SqsClient } from "./sqs.client";
import { TransactionFailedProcessor } from "./TransactionFailedProcessor";
import { ValidatePendingTransactionProcessor } from "./ValidatePendingTransactionProcessor";

@Module({
  imports: [CommonModule, InfraProvidersModule, ConsumerModule, VerificationModule, getWinstonModule()],
  controllers: [],
  providers: [
    ZeroHashService,
    TransactionService,
    AppService,
    SqsClient,
    {
      provide: "TransactionRepo",
      useClass: MongoDBTransactionRepo,
    },
    {
      // TransactionStatus.PENDING
      provide: TransactionQueueName.PendingTransactionValidation,
      useClass: ValidatePendingTransactionProcessor,
    },
    {
      // TransactionStatus.VALIDATION_PASSED || TransactionStatus.FIAT_INCOMING_INITIATING
      // SHOULD HAVE A DIFFERENT QUEUE(?)
      provide: TransactionQueueName.FiatTransactionInitiator,
      useClass: FiatTransactionInitiator,
    },
    {
      // TransactionStatus.FIAT_INCOMING_INITIATED
      provide: TransactionQueueName.FiatTransactionInitiated,
      useClass: FiatTransactionStatusProcessor,
    },

    {
      // TransactionStatus.FIAT_INCOMING_COMPLETED
      provide: TransactionQueueName.FiatTransactionCompleted,
      useClass: CryptoTransactionInitiator,
    },
    // TODO(#338): Confirm the mappings once.
    {
      // TransactionStatus.CRYPTO_OUTGOING_INITIATING
      provide: TransactionQueueName.CryptoTransactionCompleted,
      useClass: CryptoTransactionInitiator,
    },
    {
      // TransactionStatus.CRYPTO_OUTGOING_INITIATED
      provide: TransactionQueueName.CryptoTransactionInitiated,
      useClass: CryptoTransactionStatusProcessor,
    },
    {
      // TransactionStatus.CRYPTO_OUTGOING_COMPLETED
      provide: TransactionQueueName.OnChainPendingTransaction,
      useClass: OnChainPendingProcessor,
    },
    {
      // TransactionStatus.CRYPTO_OUTGOING_FAILED || TransactionStatus.FIAT_INCOMING_FAILED
      // TransactionStatus.VALIDATION_FAILED
      provide: TransactionQueueName.TransactionFailed,
      useClass: TransactionFailedProcessor,
    },
  ],
})
export class AsyncTransactionProcessorModule {}
