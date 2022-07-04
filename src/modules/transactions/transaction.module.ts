import { CacheModule, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { CheckoutPaymentMethodsService } from "../user/paymentmethods.service";
import { UserModule } from "../user/user.module";
import { UserService } from "../user/user.service";
import { ExchangeRateController } from "./exchangerate.controller";
import { ExchangeRateService } from "./exchangerate.service";
import { LimitsService } from "./limits.service";
import { MongoDBTransactionRepo } from "./repo/MongoDBTransactionRepo";
import { TransactionController } from "./transaction.controller";
import { TransactionService } from "./transaction.service";
import { ZeroHashService } from "./zerohash.service";

@Module({
  imports: [InfraProvidersModule, ConfigModule, CommonModule, UserModule, CacheModule.register()],
  controllers: [TransactionController, ExchangeRateController],
  providers: [
    TransactionService,
    DBProvider,
    ExchangeRateService,
    LimitsService,
    UserService,
    ZeroHashService,
    CheckoutPaymentMethodsService,
    {
      provide: "TransactionRepo",
      useClass: MongoDBTransactionRepo,
    },
  ],
  exports: [TransactionService], //Need to access in PublicController
})
export class TransactionModule {}
