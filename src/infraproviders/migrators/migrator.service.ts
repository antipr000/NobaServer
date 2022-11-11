import { Injectable } from "@nestjs/common";
import { ConsumerMigrator } from "./consumer.migration";
import { PaymentMethodSchemeMigrator } from "./payment.method.scheme.migration";
import { TransactionMigrator } from "./transaction.migrator";

@Injectable()
export class MigratorService {
  constructor(
    private readonly consumerMigrator: ConsumerMigrator,
    private readonly paymentMethodSchemeMigrator: PaymentMethodSchemeMigrator,
    private readonly transactionMigrator: TransactionMigrator,
  ) {}

  // Any error here would lead to server crash. It is intentional!
  public async migrateData() {
    // First ensure the the payment methods are in the right structural format
    await this.consumerMigrator.migrate();

    // Then ensure we correctly populate cardType and scheme
    await this.paymentMethodSchemeMigrator.migrate();

    // Ensure "Transaction" collection is migrated correctly for Plaid+Checkout Integration
    await this.transactionMigrator.migrate();
  }
}
