import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommonModule } from "../common/common.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { MongoDBAdminTransactionRepo } from "./repos/transactions/AdminTransactionRepo";
import { AdminMapper } from "./mappers/AdminMapper";
import { PartnerModule } from "../partner/partner.module";

@Module({
  imports: [ConfigModule, CommonModule, PartnerModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    {
      provide: "AdminTransactionRepo",
      useClass: MongoDBAdminTransactionRepo,
    },
    AdminMapper,
  ],
  exports: [AdminService],
})
export class AdminModule {}
