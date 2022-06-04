import { Module } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { TransactionService } from '../transactions/transaction.service';
import { UserModule } from '../user/user.module';
import { TransactionModule } from '../transactions/transaction.module';
import { DBProvider } from '../../infraproviders/DBProvider';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { partnerAdminRepoProvider, PartnerRepoModule, partnerRepoProvider } from './repo/PartnerRepoModule';


@Module({
  imports: [InfraProvidersModule, ConfigModule, CommonModule, PartnerRepoModule, UserModule, TransactionModule],
  controllers: [],
  providers: [UserService, DBProvider, TransactionService, partnerRepoProvider, partnerAdminRepoProvider],
  exports: []  //Need to access in PublicController
})
export class PartnerModule {}
