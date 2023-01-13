import { INestApplication } from "@nestjs/common";
import { Client } from "pg";
import { bootstrap } from "../src/server";
import { clearAccessTokenForNextRequests } from "./common";

export class IntegrationTestUtility {
  private port: number;
  private postgres_connection_string: string;
  private app: INestApplication;

  private constructor() {}

  static async setUp(port: number): Promise<IntegrationTestUtility> {
    const setup = new IntegrationTestUtility();
    setup.port = port;
    setup.postgres_connection_string = "postgresql://e2e_user:pass@localhost:5456/Noba_E2E?schema=public";

    process.env.PORT = `${setup.port}`;
    process.env.DATABASE_URL = setup.postgres_connection_string;

    const environmentVaraibles = {
      DATABASE_URL: setup.postgres_connection_string,
    };
    setup.app = await bootstrap(environmentVaraibles);
    await setup.app.listen(setup.port);
    return setup;
  }

  async reset(): Promise<void> {
    const client = new Client({
      connectionString: this.postgres_connection_string,
    });

    await client.connect();
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';",
    );
    for (const table of tables.rows) {
      await client.query(`TRUNCATE TABLE public."${table.table_name}" CASCADE;`);
    }
    await client.end();

    clearAccessTokenForNextRequests();
  }

  async tearDown(): Promise<void> {
    await this.reset();
    await this.app.close();
  }

  async getApp(): Promise<INestApplication> {
    return this.app;
  }

  getRandomEmail(base: string): string {
    return `${base}.${Math.random()}@noba.com`;
  }

  getRandomID(base: string): string {
    return `${base}.${Math.random()}`;
  }
}
