import { Module } from "@nestjs/common";
import { VerificationController, VerificationWebhookController } from "./verification.controller";
import { VerificationService } from "./verification.service";
import { ConfigModule } from "@nestjs/config";
import { ConsumerModule } from "../consumer/consumer.module";
import { Sardine } from "./integrations/Sardine";
import { SQLVerificationDataRepo } from "./repos/sql.verification.data.repo";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { DBProvider } from "../../infraproviders/DBProvider";
import { CommonModule } from "../common/common.module";
import { NotificationsModule } from "../notifications/notification.module";
import { PspModule } from "../psp/psp.module";

@Module({
  imports: [ConfigModule, ConsumerModule, InfraProvidersModule, CommonModule, NotificationsModule, PspModule],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    {
      provide: "IDVProvider",
      useClass: Sardine,
    },
    {
      provide: "VerificationDataRepo",
      useClass: SQLVerificationDataRepo,
    },
  ],
  exports: [VerificationService], //Need to access in PublicController
})
export class VerificationModule {}

@Module({
  imports: [ConfigModule, ConsumerModule, InfraProvidersModule, CommonModule, NotificationsModule, PspModule],
  controllers: [VerificationWebhookController],
  providers: [
    VerificationService,
    DBProvider,
    {
      provide: "IDVProvider",
      useClass: Sardine,
    },
    {
      provide: "VerificationDataRepo",
      useClass: SQLVerificationDataRepo,
    },
  ],
})
export class VerificationWebhookModule {}
