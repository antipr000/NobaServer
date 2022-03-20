import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { DBProvider } from '../../infraproviders/DBProvider';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { ConfigModule } from '@nestjs/config';
import { ExchangeRateController } from './exchangerate.controller';
import { ExchangeRateService } from './exchangerate.service';
import { CommonModule } from '../common/common.module';


@Module({
  imports: [InfraProvidersModule, ConfigModule, CommonModule],
  controllers: [TransactionController, ExchangeRateController],
  providers: [TransactionService, DBProvider, ExchangeRateService],
  exports: [TransactionService]  //Need to access in PublicController
})
export class TransactionModule {}
