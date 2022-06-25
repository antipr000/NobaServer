import { INestApplication } from "@nestjs/common";
import axios from "axios";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { join } from "path";
import { bootstrap } from "../src/server";
import { fetchOtpFromDb } from "./common";

describe("Authentication", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let baseUrl: string;
  let app: INestApplication

  beforeEach(async () => {
    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    console.log("MongoMemoryServer running at: ", mongoUri);

    const environmentVaraibles = {
      MONGO_URI: mongoUri,
      CONFIGS_DIR: join(__dirname, "../appconfigs"),
    }
    app = await bootstrap(environmentVaraibles);
    const port = 9000 + Math.floor(Math.random() * 100);
    await app.listen(port);

    console.log(`Server started on port '${port} ...'`);

    baseUrl = `http://localhost:${port}/v1/auth`;
    axios.defaults.baseURL = baseUrl;
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await app.close();
    await mongoServer.stop();
  });

  describe("SuccessScenarios", () => {
    /**
     * - Calls '/login' with 'CONSUMER' identityType.
     * - Calls '/verifyotp' by fetching the OTP from the database itself.
     * - Calls '/currentUser' and verify that the returned '_id' & 'email' matches.
     */
    it("Login as 'CONSUMER' is successful", async () => {
      const consumerEmail = "test+consumer@noba.com";

      const loginRequest = {
        "email": consumerEmail,
        "identityType": "CONSUMER"
      };
      const loginResponse = await axios.post("/login", loginRequest);
      expect(loginResponse.status).toBe(201);

      const verifyOtpRequest = {
        "emailOrPhone": consumerEmail,
        "otp": await fetchOtpFromDb(mongoUri, consumerEmail, 'CONSUMER'),
        "identityType": "CONSUMER"
      };
      const verifyOtpResponse = await axios.post('verifyotp', verifyOtpRequest);
      const accessToken = verifyOtpResponse.data.access_token;
      const userId = verifyOtpResponse.data.user_id;

      expect(verifyOtpResponse.status).toBe(201);
      expect(accessToken).toBeDefined();
      expect(userId).toBeDefined();

      const currentUserResponse = await axios.get("/currentUser", {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      expect(currentUserResponse.status).toBe(200);
      expect(currentUserResponse.data.email).toBe(consumerEmail);
      expect(currentUserResponse.data._id).toBe(userId);
    });
  });
});
