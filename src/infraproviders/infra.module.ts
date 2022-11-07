import { Module } from "@nestjs/common";
import { CheckoutClient } from "../modules/psp/checkout.client";
import { DBProvider } from "./DBProvider";
import { MigratorService } from "./migrators/migrator.service";
import { PaymentMethodsMigrator } from "./migrators/payment.method.migration";
import { PaymentMethodSchemeMigrator } from "./migrators/payment.method.scheme.migration";
import { AdminSeeder } from "./seeders/admin.seed";
import { CreditCardBinDataSeeder } from "./seeders/creditcard.bin.data.seed";
import { NobaPartnerSeed } from "./seeders/noba.partner.seed";
import { SeederService } from "./seeders/seeder.service";

@Module({
  providers: [
    DBProvider,
    CreditCardBinDataSeeder,
    AdminSeeder,
    NobaPartnerSeed,
    SeederService,
    PaymentMethodsMigrator,
    PaymentMethodSchemeMigrator,
    MigratorService,
    CheckoutClient,
  ],
  exports: [DBProvider, SeederService, MigratorService],
})
export class InfraProvidersModule {}
