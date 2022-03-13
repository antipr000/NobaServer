import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { DBProvider } from '../../infraproviders/DBProvider';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [InfraProvidersModule, ConfigModule],
  controllers: [TransactionController],
  providers: [TransactionService, DBProvider],
  exports: [TransactionService]  //Need to access in PublicController
})
export class TransactionModule {}
