import { Module } from '@nestjs/common';
import { InfraProvidersModule } from '../../infraproviders/infra.module';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../common/common.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';


@Module({
  imports: [InfraProvidersModule, ConfigModule, CommonModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [] 
})
export class AdminModule {}
