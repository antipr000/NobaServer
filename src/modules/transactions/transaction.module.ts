import { CacheModule, Module } from "@nestjs/common";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { ConsumerModule } from "../consumer/consumer.module";
import { VerificationModule } from "../verification/verification.module";
import { ExchangeRateController } from "./exchangerate.controller";
import { ExchangeRateService } from "./exchangerate.service";
import { LimitsService } from "./limits.service";
import { MongoDBTransactionRepo } from "./repo/MongoDBTransactionRepo";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { ZeroHashService } from "./zerohash.service";

@Module({
  imports: [InfraProvidersModule, CommonModule, ConsumerModule, VerificationModule, CacheModule.register()],
  controllers: [TransactionController, ExchangeRateController],
  providers: [
    TransactionService,
    DBProvider,
    ExchangeRateService,
    LimitsService,
    ZeroHashService,
    {
      provide: "TransactionRepo",
      useClass: MongoDBTransactionRepo,
    },
  ],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
