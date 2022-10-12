import { Module } from "@nestjs/common";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { ConfigModule } from "@nestjs/config";
import { PartnerService } from "./partner.service";
import { PartnerAdminService } from "./partneradmin.service";
import { PartnerController } from "./partner.controller";
import { MongoDBPartnerRepo } from "./repo/MongoDBPartnerRepo";
import { MongoDBPartnerAdminRepo } from "./repo/MongoDBPartnerAdminRepo";
import { TransactionModule } from "../transactions/transaction.module";

@Module({
  imports: [InfraProvidersModule, ConfigModule, TransactionModule],
  controllers: [PartnerController],
  providers: [
    DBProvider,
    PartnerService,
    PartnerAdminService,
    {
      provide: "PartnerRepo",
      useClass: MongoDBPartnerRepo,
    },
    {
      provide: "PartnerAdminRepo",
      useClass: MongoDBPartnerAdminRepo,
    },
  ],
  exports: [PartnerService, PartnerAdminService], //Need to access in PublicController
})
export class PartnerModule {}
