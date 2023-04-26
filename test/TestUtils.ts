import { INestApplication } from "@nestjs/common";
import { bootstrap } from "../src/server";
import { clearAccessTokenForNextRequests } from "./common";
import { PrismaClient } from "@prisma/client";
import { v4 } from "uuid";

export abstract class TestUtility {
  protected port: number;
  protected app: INestApplication;

  async reset(): Promise<void> {
    clearAccessTokenForNextRequests();
  }

  async suiteLevelTeardown(): Promise<void> {
    await this.app.close();
  }

  async tearDown(): Promise<void> {
    const prisma = new PrismaClient();
    await prisma.$connect();

    const tablenames = await prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter(name => name !== "_prisma_migrations")
      .map(name => `"public"."${name}"`)
      .join(", ");

    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    } catch (error) {
      console.log({ error });
    }

    await prisma.$disconnect();
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

  getRandomHandle(base: string): string {
    return `${base}${v4().slice(0, 8).replace("-", "0")}`;
  }

  getRandomPhoneNumber(extension: string): string {
    if (extension === "57") {
      return `+${extension}1615${Math.floor(Math.random() * 9000) + 1000}`;
    } else {
      return `+${extension}${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    }
  }
}

export class IntegrationTestUtility extends TestUtility {
  static async setUp(port: number): Promise<IntegrationTestUtility> {
    const setup = new IntegrationTestUtility();
    setup.port = port;
    setup.app = await bootstrap({});
    await setup.app.listen(setup.port);
    return setup;
  }
}
