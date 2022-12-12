import { Module } from "@nestjs/common";
import { CheckoutClient } from "../modules/psp/checkout.client";
import { DBProvider } from "./DBProvider";
import { MigratorService } from "./migrators/migrator.service";
import { AdminSeeder } from "./seeders/admin.seed";
import { CreditCardBinDataSeeder } from "./seeders/creditcard.bin.data.seed";
import { LimitConfigSeeder } from "./seeders/limit.config.seed";
import { LimitProfileSeeder } from "./seeders/limit.profile.seed";
import { SeederService } from "./seeders/seeder.service";

@Module({
  providers: [
    DBProvider,
    CreditCardBinDataSeeder,
    AdminSeeder,
    LimitProfileSeeder,
    LimitConfigSeeder,
    SeederService,
    MigratorService,
    CheckoutClient,
  ],
  exports: [DBProvider, SeederService, MigratorService],
})
export class InfraProvidersModule {}
