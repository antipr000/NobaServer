import { INestApplication } from "@nestjs/common";
import { bootstrap } from "../src/server";
import { clearAccessTokenForNextRequests } from "./common";

export class IntegrationTestUtility {
  private port: number;
  private postgres_connection_string: string;
  private app: INestApplication;

  static async setUp(port: number): Promise<IntegrationTestUtility> {
    const setup = new IntegrationTestUtility();
    setup.port = port;
    setup.app = await bootstrap({});
    await setup.app.listen(setup.port);
    return setup;
  }

  async reset(): Promise<void> {
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
