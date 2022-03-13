import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DBProvider } from '../../infraproviders/DBProvider';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [InfraProvidersModule, ConfigModule],
  controllers: [UserController],
  providers: [UserService, DBProvider],
  exports: [UserService]  //Need to access in PublicController
})
export class UserModule {}
