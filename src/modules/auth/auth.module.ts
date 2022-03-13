import { Module } from '@nestjs/common';
import { DBProvider } from '../../infraproviders/DBProvider';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { AuthenticationController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [InfraProvidersModule],
  controllers: [AuthenticationController],
  providers: [ DBProvider, AuthService],
})
export class AuthModule {}

//https://docs.nestjs.com/custom-decorators