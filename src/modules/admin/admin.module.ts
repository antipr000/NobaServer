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

@Module({
  imports: [ConfigModule, CommonModule, ConsumerModule, TransactionModule, InfraProvidersModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    {
      provide: "AdminTransactionRepo",
      useClass: SQLAdminRepo,
    },
    AdminMapper,
  ],
  exports: [AdminService],
})
export class AdminModule {}
