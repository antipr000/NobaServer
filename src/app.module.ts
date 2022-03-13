import { Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import { MiddlewareConsumer } from '@nestjs/common';
import { PreauthMiddleware } from './modules/auth/preauth.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './modules/auth/roles.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import loadAppConfigs from './config/AppConfigurations';
import { InfraProvidersModule } from './infraproviders/infra.module';
import { UserModule } from './modules/user/user.module';
import { TransactionModule } from './modules/transactions/tramsaction.module';

@Module({
  imports: [
    getAppConfigModule(),
    getWinstonModule(),
    InfraProvidersModule,
    AuthModule,
    UserModule, 
    TransactionModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,  
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PreauthMiddleware).forRoutes({
      path: '*', method: RequestMethod.ALL
    });
  }
}


function getAppConfigModule() { //https://docs.nestjs.com/techniques/configuration
  return ConfigModule.forRoot({
    ignoreEnvFile: true, //we don't use .env, .env.local etc. in this project and we rely that props should either come from yaml files or env variables
    load: [loadAppConfigs], //load configurations from yaml files
    isGlobal: true, //marking as global so won't have to import in each module separately
  });
}


//LoggerModuleWithConfiguration
function getWinstonModule(){
  return WinstonModule.forRoot({ 
    transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            // winston.format(info => {
            //   info.appName = "NobaServer"
            //   return info;
            // })(),
            
            winston.format.timestamp({format:()=> (new Date().toISOString())+" "}), //somewhere magic happens and z time gets converted back to local time so need to add something to prevent that conversion
            nestWinstonModuleUtilities.format.nestLike("NobaServer"),
            //winston.format.json()
          ),
        }),
     // other transports...
     ],
  })
}
