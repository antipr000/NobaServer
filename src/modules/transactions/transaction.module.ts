import { Module } from "@nestjs/common";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { ConsumerModule } from "../consumer/consumer.module";
import { VerificationModule } from "../verification/verification.module";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { ZeroHashService } from "./zerohash.service";
import { AssetsModule } from "./assets/assets.module";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";
import { NotificationsModule } from "../notifications/notification.module";
import { PspModule } from "../psp/psp.module";
import { TransactionRepoModule } from "./repo/transaction.repo.module";

@Module({
  imports: [
    InfraProvidersModule,
    CommonModule,
    ConsumerModule,
    VerificationModule,
    AssetsModule,
    NotificationsModule,
    PspModule,
    TransactionRepoModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService, ZeroHashService, SanctionedCryptoWalletService],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
