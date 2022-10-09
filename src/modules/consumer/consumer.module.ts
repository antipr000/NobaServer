import { Module } from "@nestjs/common";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { MongoDBOtpRepo } from "../auth/repo/MongoDBOtpRepo";
import { CommonModule } from "../common/common.module";
import { PartnerModule } from "../partner/partner.module";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";
import { ConsumerController } from "./consumer.controller";
import { ConsumerService } from "./consumer.service";
import { MongoDBConsumerRepo } from "./repos/MongoDBConsumerRepo";
import { NotificationsModule } from "../notifications/notification.module";
import { PspModule } from "../psp/psp.module";

@Module({
  imports: [InfraProvidersModule, CommonModule, PartnerModule, NotificationsModule, PspModule],
  controllers: [ConsumerController],
  providers: [
    ConsumerService,
    DBProvider,
    {
      provide: "ConsumerRepo",
      useClass: MongoDBConsumerRepo,
    },
    {
      provide: "OTPRepo",
      useClass: MongoDBOtpRepo,
    },
    SanctionedCryptoWalletService,
  ],
  exports: [ConsumerService],
})
export class ConsumerModule {}
