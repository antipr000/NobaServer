import { Injectable } from "@nestjs/common";
import { PaymentMethodsMigrator } from "./payment.method.migration";

@Injectable()
export class MigratorService {
  constructor(private readonly paymentMethodMigrator: PaymentMethodsMigrator) {}

  // Any error here would lead to server crash. It is intentional!
  public async migrateData() {
    await this.paymentMethodMigrator.migrate();
  }
}
