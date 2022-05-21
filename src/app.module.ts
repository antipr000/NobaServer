import { Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MiddlewareConsumer } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { getAppConfigModule } from './core/utils/AppConfigModule';
import { getWinstonModule } from './core/utils/WinstonModule';
import { InfraProvidersModule } from './infraproviders/infra.module';
import { UserModule } from './modules/user/user.module';
import { TransactionModule } from './modules/transactions/transaction.module';
import { VerificationModule } from './modules/verification/verification.module';
import { CommonModule } from './modules/common/common.module';
import { AdminModule } from './modules/admin/admin.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';

@Module({
  imports: [
    getAppConfigModule(),
    getWinstonModule(),
    InfraProvidersModule,
    CommonModule,
    AuthModule,
    UserModule,
    VerificationModule,
    TransactionModule,
    AdminModule,
    ScheduleModule.forRoot(),   
  ],
  controllers: [AppController],
  providers: [
    AppService,  
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    //
  }
}

