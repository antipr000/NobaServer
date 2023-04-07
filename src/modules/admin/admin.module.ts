import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "../common/common.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { SQLAdminRepo } from "./repos/transactions/sql.admin.repo";
import { AdminMapper } from "./mappers/AdminMapper";
import { ConsumerModule } from "../consumer/consumer.module";
import { TransactionModule } from "../transaction/transaction.module";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { PspModule } from "../psp/psp.module";
import { EmployeeModule } from "../employee/employee.module";
import { EmployerModule } from "../employer/employer.module";
import {
  TransactionMappingService,
  TRANSACTION_MAPPING_SERVICE_PROVIDER,
} from "../transaction/mapper/transaction.mapper.service";
import { MonoModule } from "../psp/mono/mono.module";
import { CirclePublicModule } from "../circle/public/circle.public.module";

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    ConsumerModule,
    TransactionModule,
    InfraProvidersModule,
    PspModule,
    EmployeeModule,
    EmployerModule,
    MonoModule,
    CirclePublicModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    {
      provide: "AdminTransactionRepo",
      useClass: SQLAdminRepo,
    },
    AdminMapper,
    {
      provide: TRANSACTION_MAPPING_SERVICE_PROVIDER,
      useClass: TransactionMappingService,
    },
  ],
  exports: [AdminService],
})
export class AdminModule {}
