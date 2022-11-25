import { Injectable } from "@nestjs/common";
import { ConsumerHandleMigrator } from "./consumer.handle.migration";
import { ConsumerMigrator } from "./consumer.migration";
import { PaymentMethodSchemeMigrator } from "./payment.method.scheme.migration";
import { TransactionDiscountsMigrator } from "./transaction.discounts.migrator";
import { TransactionMigrator } from "./transaction.migrator";
import { ConsumerPhoneMigrator } from "./consumer.phone.migrator";

@Injectable()
export class MigratorService {
  constructor(
    private readonly consumerMigrator: ConsumerMigrator,
    private readonly paymentMethodSchemeMigrator: PaymentMethodSchemeMigrator,
    private readonly transactionMigrator: TransactionMigrator,
    private readonly transactionDiscountsMigrator: TransactionDiscountsMigrator,
    private readonly consumerHandleMigrator: ConsumerHandleMigrator,
    private readonly consumerPhoneMigrator: ConsumerPhoneMigrator,
  ) {}

  // Any error here would lead to server crash. It is intentional!
  public async migrateData() {
    // First ensure the the payment methods are in the right structural format
    await this.consumerMigrator.migrate();

    // Then ensure we correctly populate cardType and scheme
    await this.paymentMethodSchemeMigrator.migrate();

    // Ensure "Transaction" collection is migrated correctly for Plaid+Checkout Integration
    await this.transactionMigrator.migrate();

    // Ensure 'discounts' sub-collection in "Transaction" collection is migrated correctly.
    await this.transactionDiscountsMigrator.migrate();

    // Add the 'handle' field in all the documents of the "Consumer" collection.
    await this.consumerHandleMigrator.migrate();

    // Remove spaces from phone numbers
    await this.consumerPhoneMigrator.migrate();
  }
}
