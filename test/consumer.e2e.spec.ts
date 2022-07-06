/**
 * Setup the required environment variables for
 *   - API Client
 *   - Test Configs for different Vendors
 *
 * This is required to be the very first line in
 * the test files (even before other imports) as
 * API Client requires certain environment variables
 * to be set before any of it's class is even
 * imported.
 */
import { setUp } from "./setup";
setUp();

import { INestApplication } from "@nestjs/common";
import { } from "./api_client";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { ConsumerService } from "./api_client/services/ConsumerService";
import { ConsumerDTO } from "./api_client/models/ConsumerDTO";
import { bootstrap } from "../src/server";
import { insertNobaAdmin, insertPartnerAdmin, setAccessTokenForTheNextRequests } from "./common";
import { ResponseStatus } from "./api_client/core/request";

describe("Authentication", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let app: INestApplication;

  beforeEach(async () => {
    const port = process.env.PORT;

    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();

    const environmentVaraibles = {
      MONGO_URI: mongoUri,
    };
    app = await bootstrap(environmentVaraibles);
    await app.listen(port);
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await app.close();
    await mongoServer.stop();
  });

  describe("GET /consumers", () => {
    it("shouldn't allow PartnerAdmin identity to call this API", async () => {

    });

    it("shouldn't allow NobaAdmin identity to call this API", async () => {

    });

    it("should allow Consumer identity to call this API", async () => {

    });
  });

  describe("PATCH /consumers", () => {
    it("shouldn't allow PartnerAdmin identity to call this API", async () => {

    });

    it("shouldn't allow NobaAdmin identity to call this API", async () => {

    });

    it("should updates 'firstName' if Consumer identity calls this API", async () => {

    });

    it("should updates 'lastName' if Consumer identity calls this API", async () => {

    });

    it("should updates 'dateOfBirth' if Consumer identity calls this API", async () => {

    });

    it("should updates 'address' if Consumer identity calls this API", async () => {

    });
  });
});