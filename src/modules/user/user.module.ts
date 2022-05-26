import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DBProvider } from '../../infraproviders/DBProvider';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { ConfigModule } from '@nestjs/config';
import { DetachPaymentMethodController, PaymentMethodsController } from './paymentmethods.controller';
import { CommonModule } from '../common/common.module';
import { StripePaymentMethodsService } from './paymentmethods.service';


@Module({
  imports: [InfraProvidersModule, ConfigModule, CommonModule],
  controllers: [UserController, PaymentMethodsController, DetachPaymentMethodController],
  providers: [UserService, DBProvider, StripePaymentMethodsService],
  exports: [UserService]  //Need to access in PublicController
})
export class UserModule {}
