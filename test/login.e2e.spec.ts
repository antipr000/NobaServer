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
import { AuthenticationService, VerifyOtpResponseDTO } from "./api_client";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { bootstrap } from "../src/server";
import { fetchOtpFromDb } from "./common";
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
    console.log("MongoMemoryServer running at: ", mongoUri);

    const environmentVaraibles = {
      MONGO_URI: mongoUri,
    };
    app = await bootstrap(environmentVaraibles);
    await app.listen(port);

    console.log(`Server started on port '${port} ...'`);
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await app.close();
    await mongoServer.stop();
  });

  describe("CONSUMER", () => {
    it("signup as 'CONSUMER' is successful", async () => {
      const consumerEmail = "test+consumer@noba.com";

      const loginResponse = await AuthenticationService.loginUser({
        email: consumerEmail,
        identityType: "CONSUMER"
      });
      expect(loginResponse.__status).toBe(201);

      const verifyOtpResponse = await AuthenticationService.verifyOtp({
        emailOrPhone: consumerEmail,
        otp: await fetchOtpFromDb(mongoUri, consumerEmail, "CONSUMER"),
        identityType: "CONSUMER",
      }) as VerifyOtpResponseDTO & ResponseStatus;

      const accessToken = verifyOtpResponse.access_token;
      const userId = verifyOtpResponse.user_id;

      expect(verifyOtpResponse.__status).toBe(201);
      expect(accessToken).toBeDefined();
      expect(userId).toBeDefined();
    });

    it("signup with invalid 'identityType' throws 400 error", async () => {
      const consumerEmail = "test+consumer@noba.com";

      const loginResponse = await AuthenticationService.loginUser({
        email: consumerEmail,
        identityType: "CONSUMR" as any
      });
      expect(loginResponse.__status).toBe(400);
    });
  });

  // describe("NOBA_ADMIN", () => {
  //   it("signup as 'NOBA_ADMIN' is Forbidden", async () => {
  //     const adminEmail = "test+admin@noba.com";

  //     const loginRequest = {
  //       email: adminEmail,
  //       identityType: "NOBA_ADMIN",
  //     };
  //     try {
  //       await axios.post("/login", loginRequest);
  //       expect(true).toBe(false);
  //     } catch (err) {
  //       expect(err.response.status).toBe(403);
  //     }
  //   });

  //   it("login as 'NOBA_ADMIN' fails even if a 'CONSUMER' with same email exist", async () => {
  //     const adminEmail = "test+admin.consumer@noba.com";

  //     const loginRequest = {
  //       email: adminEmail,
  //       identityType: "NOBA_ADMIN",
  //     };
  //     try {
  //       await axios.post("/login", loginRequest);
  //       expect(true).toBe(false);
  //     } catch (err) {
  //       expect(err.response.status).toBe(403);
  //     }
  //   });
  // });
});
