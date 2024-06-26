import { Module } from "@nestjs/common";
import { VerificationController, VerificationWebhookController } from "./verification.controller";
import { VerificationService } from "./verification.service";
import { ConfigModule } from "@nestjs/config";
import { ConsumerModule } from "../consumer/consumer.module";
import { Sardine } from "./integrations/sardine.client";
import { SQLVerificationDataRepo } from "./repos/sql.verificationdata.repo";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { CommonModule } from "../common/common.module";
import { NotificationsModule } from "../notifications/notification.module";
import { PspModule } from "../psp/psp.module";
import { CirclePublicModule } from "../circle/public/circle.public.module";

@Module({
  imports: [
    ConfigModule,
    ConsumerModule,
    InfraProvidersModule,
    CommonModule,
    NotificationsModule,
    PspModule,
    CirclePublicModule,
  ],
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
  imports: [
    ConfigModule,
    ConsumerModule,
    InfraProvidersModule,
    CommonModule,
    NotificationsModule,
    PspModule,
    CirclePublicModule,
  ],
  controllers: [VerificationWebhookController],
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
})
export class VerificationWebhookModule {}
