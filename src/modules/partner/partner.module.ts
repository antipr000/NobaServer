import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DBProvider } from "../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../infraproviders/infra.module";
import { ConsumerRepoModule } from "../consumer/repos/consumer.repo.module";
import { TransactionRepoModule } from "../transactions/repo/transaction.repo.module";
import { PartnerController } from "./partner.controller";
import { PartnerService } from "./partner.service";
import { PartnerAdminService } from "./partneradmin.service";
import { MongoDBPartnerAdminRepo } from "./repo/MongoDBPartnerAdminRepo";
import { MongoDBPartnerRepo } from "./repo/MongoDBPartnerRepo";

@Module({
  imports: [InfraProvidersModule, ConfigModule, TransactionRepoModule, ConsumerRepoModule],
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
