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
import { TransactionModule } from "./modules/transactions/transaction.module";
import { TransactionModule as TransactionModuleV2 } from "./modules/transaction/transaction.module";
import { VerificationModule, VerificationWebhookModule } from "./modules/verification/verification.module";
import { CommonModule } from "./modules/common/common.module";
import { AdminModule } from "./modules/admin/admin.module";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";
import { EventEmitterModule } from "@nestjs/event-emitter";

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
    TransactionModuleV2,
    AdminModule,
    ScheduleModule.forRoot(),
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
