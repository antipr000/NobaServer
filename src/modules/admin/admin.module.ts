import { Module } from '@nestjs/common';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { TransactionsAdminController } from './transactions.admin.controller';
import { TransactionAdminService } from './transactions.admin.service';


@Module({
  imports: [InfraProvidersModule, ConfigModule, CommonModule],
  controllers: [TransactionsAdminController],
  providers: [TransactionAdminService],
  exports: [] 
})
export class AdminModule {}
