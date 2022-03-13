import { Module } from '@nestjs/common';
import { DBProvider } from '../../infraproviders/DBProvider';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { AuthenticationController } from './auth.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [InfraProvidersModule, UserModule],
  controllers: [AuthenticationController],
  providers: [ DBProvider],
})
export class AuthModule {}

//https://docs.nestjs.com/custom-decorators