import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { ConsumerModule } from "../consumer/consumer.module";
import { VerificationModule } from "../verification/verification.module";
import { LimitsService } from "./limits.service";
import { PartnerModule } from "../partner/partner.module";
import { MongoDBTransactionRepo } from "./repo/MongoDBTransactionRepo";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { ZeroHashService } from "./zerohash.service";
import { AsyncTransactionProcessorModule } from "./queueprocessors/processors.module";
import { AssetsModule } from "./assets/assets.module";
import { SquidService } from "./squid.service";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";

@Module({
  imports: [
    InfraProvidersModule,
    CommonModule,
    ConsumerModule,
    VerificationModule,
    PartnerModule,
    AsyncTransactionProcessorModule,
    AssetsModule,
  ],
  controllers: [TransactionController],
  providers: [
    TransactionService,
    LimitsService,
    ZeroHashService,
    {
      provide: "TransactionRepo",
      useClass: MongoDBTransactionRepo,
    },
    SquidService,
    SanctionedCryptoWalletService,
  ],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
