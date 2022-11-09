import { Injectable } from "@nestjs/common";
import { ConsumerMigrator } from "./consumer.migration";

@Injectable()
export class MigratorService {
  constructor(private readonly consumerMigrator: ConsumerMigrator) {}

  // Any error here would lead to server crash. It is intentional!
  public async migrateData() {
    await this.consumerMigrator.migrate();
  }
}
