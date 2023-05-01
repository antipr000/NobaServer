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
import { PspModule, PspWorkflowModule } from "./modules/psp/psp.module";
import { PrivateAuthGuard } from "./modules/auth/private-auth.guard";
import { NotificationWorkflowModule } from "./modules/notifications/notification.workflow.module";
import { BubbleModule } from "./modules/bubble/bubble.module";
import { TemporalModule } from "./infra/temporal/temporal.module";
import { CardModule } from "./modules/psp/card/card.module";
import { PomeloPublicModule } from "./modules/pomelo/public/pomelo.public.module";
import { PomeloWebhooksModule } from "./modules/pomelo/webhook/pomelo.webhook.module";
import { CirclePublicModule } from "./modules/circle/public/circle.public.module";
import { CircleWorkflowModule } from "./modules/circle/workflow/circle.workflow.module";
import { ExchangeRateModule } from "./modules/exchangerate/exchangerate.module";
import { PomeloWorkflowModule } from "./modules/pomelo/workflow/pomelo.workflow.module";
import { MonoPublicModule } from "./modules/mono/public/mono.public.module";
import { MonoWebhookModule } from "./modules/mono/webhook/mono.webhook.module";
import { MonoWorkflowModule } from "./modules/mono/workflow/mono.workflow.module";

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
    MonoPublicModule,
    MonoWebhookModule,
    MonoWorkflowModule,
    BubbleModule,
    TransactionWorkflowModule,
    PspWorkflowModule,
    NotificationWorkflowModule,
    TemporalModule,
    ScheduleModule.forRoot(),
    CardModule,
    // Follow the new structure that is being decided upon
    // https://www.notion.so/onenoba/Code-Structure-15e7b735f00a4dd980d0ebe23d6af18a
    PomeloPublicModule,
    PomeloWebhooksModule,
    PomeloWorkflowModule,
    CirclePublicModule,
    CircleWorkflowModule,
    ExchangeRateModule,
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
    MonoPublicModule,
    MonoWebhookModule,
    MonoWorkflowModule,
    BubbleModule,
    PspWorkflowModule,
    TransactionWorkflowModule,
    NotificationWorkflowModule,
    ScheduleModule.forRoot(),
    // Follow the new structure that is being decided upon
    // https://www.notion.so/onenoba/Code-Structure-15e7b735f00a4dd980d0ebe23d6af18a
    PomeloPublicModule,
    PomeloWebhooksModule,
    PomeloWorkflowModule,
    CirclePublicModule,
    CircleWorkflowModule,
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
