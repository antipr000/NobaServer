import { Module } from '@nestjs/common';
import { UserModule } from "../user/user.module";
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { jwtConstants } from './constants';
import { DBProvider } from '../../infraproviders/DBProvider';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { CommonModule } from '../common/common.module';
import { MongoDBOtpRepo } from './repo/MongoDBOtpRepo';
import { UserAuthService } from './user.auth.service';
import { AdminModule } from '../admin/admin.module';
import { AdminAuthService } from './admin.auth.service';

@Module({
  imports: [
    UserModule,
    AdminModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '86400s' }  /* 1 day */
    }),
    InfraProvidersModule,
    ConfigModule,
    CommonModule
  ],
  providers: [
    JwtStrategy,
    DBProvider,
    {
      provide: 'OTPRepo',
      useClass: MongoDBOtpRepo
    },
    UserAuthService,
    AdminAuthService
  ],
  controllers: [AuthController],
})
export class AuthModule { }
