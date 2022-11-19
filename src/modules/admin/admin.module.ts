import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "../common/common.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { MongoDBAdminTransactionRepo } from "./repos/transactions/AdminTransactionRepo";
import { AdminMapper } from "./mappers/AdminMapper";
import { PartnerModule } from "../partner/partner.module";
import { DBProvider } from "../../infraproviders/DBProvider";
import { ConsumerModule } from "../consumer/consumer.module";
import { TransactionModule } from "../transactions/transaction.module";

@Module({
  imports: [ConfigModule, CommonModule, PartnerModule, ConsumerModule, TransactionModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    {
      provide: "AdminTransactionRepo",
      useClass: MongoDBAdminTransactionRepo,
    },
    AdminMapper,
    DBProvider,
  ],
  exports: [AdminService],
})
export class AdminModule {}
