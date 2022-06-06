import { Module } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { UserModule } from '../user/user.module';
import { DBProvider } from '../../infraproviders/DBProvider';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { partnerAdminRepoProvider, PartnerRepoModule, partnerRepoProvider } from './repo/PartnerRepoModule';
import { PartnerService } from './partner.service';
import { PartnerAdminService } from './partneradmin.service';


@Module({
  imports: [InfraProvidersModule, ConfigModule, CommonModule, PartnerRepoModule, UserModule],
  controllers: [],
  providers: [UserService, DBProvider, partnerRepoProvider, partnerAdminRepoProvider, PartnerService, PartnerAdminService],
  exports: [PartnerService, PartnerAdminService]  //Need to access in PublicController
})
export class PartnerModule {}
