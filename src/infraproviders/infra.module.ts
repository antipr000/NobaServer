import { Module } from "@nestjs/common";
import { CheckoutClient } from "../modules/psp/checkout.client";
import { DBProvider } from "./DBProvider";
import { ConsumerHandleMigrator } from "./migrators/consumer.handle.migration";
import { ConsumerMigrator } from "./migrators/consumer.migration";
import { ConsumerPhoneMigrator } from "./migrators/consumer.phone.migrator";
import { MigratorService } from "./migrators/migrator.service";
import { PaymentMethodSchemeMigrator } from "./migrators/payment.method.scheme.migration";
import { TransactionDiscountsMigrator } from "./migrators/transaction.discounts.migrator";
import { TransactionMigrator } from "./migrators/transaction.migrator";
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
    ConsumerMigrator,
    PaymentMethodSchemeMigrator,
    TransactionDiscountsMigrator,
    TransactionMigrator,
    ConsumerPhoneMigrator,
    MigratorService,
    CheckoutClient,
    ConsumerHandleMigrator,
  ],
  exports: [DBProvider, SeederService, MigratorService],
})
export class InfraProvidersModule {}
