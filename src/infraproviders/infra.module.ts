import { Module } from "@nestjs/common";
import { DBProvider } from "./DBProvider";
import { AdminSeeder } from "./seeders/admin.seed";
import { CreditCardBinDataSeeder } from "./seeders/creditcard.bin.data.seed";
import { NobaPartnerSeed } from "./seeders/noba.partner.seed";
import { SeederService } from "./seeders/seeder.service";

@Module({
  providers: [DBProvider, CreditCardBinDataSeeder, AdminSeeder, NobaPartnerSeed, SeederService],
  exports: [DBProvider, SeederService],
})
export class InfraProvidersModule {}
