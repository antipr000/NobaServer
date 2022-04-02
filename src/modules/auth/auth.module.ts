import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DBProvider } from '../../infraproviders/DBProvider';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { CommonModule } from '../common/common.module';
import { UserModule } from '../user/user.module';
import { AuthenticationController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [InfraProvidersModule,  ConfigModule, UserModule, CommonModule],
  controllers: [AuthenticationController],
  providers: [ DBProvider, AuthService],
})
export class AuthModule {}

//https://docs.nestjs.com/custom-decorators