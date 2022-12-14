import { Module } from "@nestjs/common";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { SanctionedCryptoWalletService } from "../common/sanctionedcryptowallet.service";
import { ConsumerController } from "./consumer.controller";
import { ConsumerService } from "./consumer.service";
import { NotificationsModule } from "../notifications/notification.module";
import { PspModule } from "../psp/psp.module";
import { SMSService } from "../common/sms.service";
import { ConsumerRepoModule } from "./repos/consumer.repo.module";
import { SQLOTPRepo } from "../auth/repo/SQLOTPRepo";

@Module({
  imports: [InfraProvidersModule, CommonModule, NotificationsModule, PspModule, ConsumerRepoModule],
  controllers: [ConsumerController],
  providers: [
    ConsumerService,
    DBProvider,
    {
      provide: "OTPRepo",
      useClass: SQLOTPRepo,
    },
    SanctionedCryptoWalletService,
    SMSService,
  ],
  exports: [ConsumerService],
})
export class ConsumerModule {}
