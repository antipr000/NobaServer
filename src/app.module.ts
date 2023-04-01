import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./modules/auth/auth.module";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { CustomConfigModule } from "./core/utils/AppConfigModule";
import { getWinstonModule } from "./core/utils/WinstonModule";
import { InfraProvidersModule } from "./infraproviders/infra.module";
import { ConsumerModule } from "./modules/consumer/consumer.module";
import { TransactionModule, TransactionWorkflowModule } from "./modules/transaction/transaction.module";
import { VerificationModule, VerificationWebhookModule } from "./modules/verification/verification.module";
import { CommonModule } from "./modules/common/common.module";
import { AdminModule } from "./modules/admin/admin.module";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MonoModule } from "./modules/psp/mono/mono.module";
import { PspModule, PspWorkflowModule } from "./modules/psp/psp.module";
import { PrivateAuthGuard } from "./modules/auth/private-auth.guard";
import { NotificationWorkflowModule } from "./modules/notifications/notification.workflow.module";
import { BubbleModule } from "./modules/bubble/bubble.module";
import { TemporalModule } from "./infra/temporal/temporal.module";
import { CardModule } from "./modules/psp/card/card.module";

@Module({
  imports: [
    CustomConfigModule,
    getWinstonModule(),
    EventEmitterModule.forRoot(),
    InfraProvidersModule,
    CommonModule,
    AuthModule,
    ConsumerModule,
    VerificationModule,
    VerificationWebhookModule,
    TransactionModule,
    AdminModule,
    PspModule,
    // TODO: Remove this once we have a proper way to handle PSP dependencies.
    MonoModule,
    BubbleModule,
    TransactionWorkflowModule,
    PspWorkflowModule,
    NotificationWorkflowModule,
    TemporalModule,
    ScheduleModule.forRoot(),
    CardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

@Module({
  imports: [
    CustomConfigModule,
    getWinstonModule(),
    EventEmitterModule.forRoot(),
    InfraProvidersModule,
    CommonModule,
    AuthModule,
    ConsumerModule,
    VerificationModule,
    VerificationWebhookModule,
    TransactionModule,
    AdminModule,
    // TODO: Remove this once we have a proper way to handle PSP dependencies.
    MonoModule,
    BubbleModule,
    PspWorkflowModule,
    TransactionWorkflowModule,
    NotificationWorkflowModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: PrivateAuthGuard,
    },
  ],
})
export class PrivateAppModule {}
