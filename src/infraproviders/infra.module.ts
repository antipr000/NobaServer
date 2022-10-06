import { Module } from "@nestjs/common";
import { DBProvider } from "./DBProvider";
import { CreditCardBinDataSeeder } from "./seeders/creditcard.bin.data.seed";
import { SeederService } from "./seeders/seeder.service";

@Module({
  providers: [DBProvider, CreditCardBinDataSeeder, SeederService],
  exports: [DBProvider, SeederService],
})
export class InfraProvidersModule {}
