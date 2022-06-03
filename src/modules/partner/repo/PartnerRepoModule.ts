import { MongoDBPartnerAdminRepo } from "./MongoDBPartnerAdminRepo";
import { MongoDBPartnerRepo } from "./MongoDBPartnerRepo";
import { IPartnerAdminRepo } from "./PartnerAdminRepo";
import { IPartnerRepo } from "./PartnerRepo";
import { Module } from "@nestjs/common";
import { DBProvider } from "../../../infraproviders/DBProvider";
import { InfraProvidersModule } from "../../../infraproviders/infra.module";

export const partnerRepoProvider = {
    provide: IPartnerRepo,
    useClass: MongoDBPartnerRepo
};

export const partnerAdminRepoProvider = {
    provide: IPartnerAdminRepo,
    useClass: MongoDBPartnerAdminRepo
};
  
  @Module({
    imports: [InfraProvidersModule],
    providers: [DBProvider, partnerAdminRepoProvider, partnerRepoProvider],
    exports: [partnerAdminRepoProvider, partnerRepoProvider]
  })

export class PartnerRepoModule {}