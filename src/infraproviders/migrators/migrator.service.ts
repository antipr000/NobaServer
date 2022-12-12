import { Injectable } from "@nestjs/common";

@Injectable()
export class MigratorService {
  constructor() {}

  // Any error here would lead to server crash. It is intentional!
  public async migrateData() {}
}
