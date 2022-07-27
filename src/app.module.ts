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
import { VerificationModule, VerificationWebhookModule } from "./modules/verification/verification.module";
import { CommonModule } from "./modules/common/common.module";
import { AdminModule } from "./modules/admin/admin.module";
import { PartnerModule } from "./modules/partner/partner.module";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";

@Module({
  imports: [
    CustomConfigModule,
    getWinstonModule(),
    InfraProvidersModule,
    CommonModule,
    AuthModule,
    ConsumerModule,
    VerificationModule,
    VerificationWebhookModule,
    TransactionModule,
    AdminModule,
    PartnerModule,
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
