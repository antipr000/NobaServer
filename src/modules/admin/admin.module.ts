import { Module } from '@nestjs/common';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MongoDBAdminTransactionRepo } from './repos/transactions/AdminTransactionRepo';

@Module({
  imports: [InfraProvidersModule, ConfigModule, CommonModule],
  controllers: [AdminController],
  providers: [AdminService, {
    provide: 'AdminTransactionRepo',
    useClass: MongoDBAdminTransactionRepo
  }],
  exports: []
})
export class AdminModule { }
