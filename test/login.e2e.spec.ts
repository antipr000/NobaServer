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
import { AuthenticationService, LoginRequestDTO, VerifyOtpRequestDTO, VerifyOtpResponseDTO } from "./api_client";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { ConsumerService } from "./api_client/services/ConsumerService";
import { ConsumerDTO } from "./api_client/models/ConsumerDTO";
import { bootstrap } from "../src/server";
import {
  clearAccessTokenForNextRequests,
  computeSignature,
  fetchOtpFromDb,
  insertNobaAdmin,
  insertPartnerAdmin,
  setAccessTokenForTheNextRequests,
  setupCustomPartner,
  setupPartner,
  TEST_API_KEY,
} from "./common";
import { ResponseStatus } from "./api_client/core/request";
import { getRandomEmail, getRandomID } from "./TestUtils";

describe("Authentication", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let app: INestApplication;
  const partnerId = "dummy-partner";
  let timestamp;

  beforeAll(async () => {
    const port = process.env.PORT;

    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await setupPartner(mongoUri, partnerId);

    const environmentVaraibles = {
      MONGO_URI: mongoUri,
    };
    app = await bootstrap(environmentVaraibles);
    await app.listen(port);
    timestamp = new Date().getTime().toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await app.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    clearAccessTokenForNextRequests();
  });

  describe("SignUp or Login as CONSUMER", () => {
    it("should be successful", async () => {
      const consumerEmail = getRandomEmail("test+consumer");

      const loginRequestBody: LoginRequestDTO = {
        email: consumerEmail,
        identityType: "CONSUMER",
      };

      const loginSignature = computeSignature(timestamp, "POST", "/v1/auth/login", JSON.stringify(loginRequestBody));

      const loginResponse = await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: loginSignature,
        xNobaTimestamp: timestamp,
        requestBody: loginRequestBody,
      });
      expect(loginResponse.__status).toBe(201);

      const verifyOtpRequestBody: VerifyOtpRequestDTO = {
        emailOrPhone: consumerEmail,
        otp: await fetchOtpFromDb(mongoUri, consumerEmail, "CONSUMER"),
        identityType: "CONSUMER",
      };

      const verifyOtpSignature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/verifyotp",
        JSON.stringify(verifyOtpRequestBody),
      );

      const verifyOtpResponse = (await AuthenticationService.verifyOtp({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: verifyOtpSignature,
        xNobaTimestamp: timestamp,
        requestBody: verifyOtpRequestBody,
      })) as VerifyOtpResponseDTO & ResponseStatus;
      console.log(verifyOtpResponse);

      const accessToken = verifyOtpResponse.access_token;
      const userId = verifyOtpResponse.user_id;

      expect(verifyOtpResponse.__status).toBe(201);
      expect(accessToken).toBeDefined();
      expect(userId).toBeDefined();

      setAccessTokenForTheNextRequests(accessToken);

      const getConsumerSignature = computeSignature(timestamp, "GET", "/v1/consumers", JSON.stringify({}));
      const loggedInConsumer = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: getConsumerSignature,
        xNobaTimestamp: timestamp,
      })) as ConsumerDTO & ResponseStatus;

      expect(loggedInConsumer.__status).toBe(200);
      expect(loggedInConsumer._id).toBe(userId);
      expect(loggedInConsumer.email).toBe(consumerEmail);
    });

    it("should not allow jwt for same consumer issued with different partner", async () => {
      const apiKey = "dummy-api-key-2";
      const secretKey = "dummy-secret-key-2";
      await setupCustomPartner(mongoUri, "new-dummy-partner", "Dummy Partner 2", apiKey, secretKey);

      // Login with new partner
      const consumerEmail = getRandomEmail("test+consumer");

      const loginRequestBody: LoginRequestDTO = {
        email: consumerEmail,
        identityType: "CONSUMER",
      };

      const loginSignature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify(loginRequestBody),
        apiKey,
        secretKey,
      );

      const loginResponse = await AuthenticationService.loginUser({
        xNobaApiKey: apiKey,
        xNobaSignature: loginSignature,
        xNobaTimestamp: timestamp,
        requestBody: loginRequestBody,
      });
      expect(loginResponse.__status).toBe(201);

      const verifyOtpRequestBody: VerifyOtpRequestDTO = {
        emailOrPhone: consumerEmail,
        otp: await fetchOtpFromDb(mongoUri, consumerEmail, "CONSUMER"),
        identityType: "CONSUMER",
      };

      const verifyOtpSignature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/verifyotp",
        JSON.stringify(verifyOtpRequestBody),
        apiKey,
        secretKey,
      );

      const verifyOtpResponse = (await AuthenticationService.verifyOtp({
        xNobaApiKey: apiKey,
        xNobaSignature: verifyOtpSignature,
        xNobaTimestamp: timestamp,
        requestBody: verifyOtpRequestBody,
      })) as VerifyOtpResponseDTO & ResponseStatus;
      console.log(verifyOtpResponse);

      const accessToken = verifyOtpResponse.access_token;
      const userId = verifyOtpResponse.user_id;

      expect(verifyOtpResponse.__status).toBe(201);
      expect(accessToken).toBeDefined();
      expect(userId).toBeDefined();

      setAccessTokenForTheNextRequests(accessToken);

      // Make request with first partner now
      const getConsumerSignature = computeSignature(timestamp, "GET", "/v1/consumers", JSON.stringify({}));
      const loggedInConsumer = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: getConsumerSignature,
        xNobaTimestamp: timestamp,
      })) as ConsumerDTO & ResponseStatus;

      expect(loggedInConsumer.__status).toBe(401);
    });

    it("should be successful with different cases", async () => {
      const consumerEmail = getRandomEmail("TEsT+ConSUMer");
      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: consumerEmail,
          identityType: "CONSUMER",
        }),
      );

      await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: consumerEmail,
          identityType: "CONSUMER",
        },
      });

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/verifyotp",
        JSON.stringify({
          emailOrPhone: consumerEmail,
          otp: await fetchOtpFromDb(mongoUri, consumerEmail, "CONSUMER"),
          identityType: "CONSUMER",
        }),
      );

      (await AuthenticationService.verifyOtp({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: consumerEmail,
          otp: await fetchOtpFromDb(mongoUri, consumerEmail, "CONSUMER"),
          identityType: "CONSUMER",
        },
      })) as VerifyOtpResponseDTO & ResponseStatus;

      const newRequestConsumerEmail = consumerEmail.toLowerCase();

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: consumerEmail,
          identityType: "CONSUMER",
        }),
      );

      const loginResponse = await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: consumerEmail,
          identityType: "CONSUMER",
        },
      });
      expect(loginResponse.__status).toBe(201);

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/verifyotp",
        JSON.stringify({
          emailOrPhone: consumerEmail,
          otp: await fetchOtpFromDb(mongoUri, consumerEmail, "CONSUMER"),
          identityType: "CONSUMER",
        }),
      );

      const verifyOtpResponse = (await AuthenticationService.verifyOtp({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: consumerEmail,
          otp: await fetchOtpFromDb(mongoUri, consumerEmail, "CONSUMER"),
          identityType: "CONSUMER",
        },
      })) as VerifyOtpResponseDTO & ResponseStatus;
      console.log(verifyOtpResponse);

      const accessToken = verifyOtpResponse.access_token;
      const userId = verifyOtpResponse.user_id;

      expect(verifyOtpResponse.__status).toBe(201);
      expect(accessToken).toBeDefined();
      expect(userId).toBeDefined();

      setAccessTokenForTheNextRequests(accessToken);

      const getConsumerSignature = computeSignature(timestamp, "GET", "/v1/consumers", JSON.stringify({}));
      const loggedInConsumer = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: getConsumerSignature,
        xNobaTimestamp: timestamp,
      })) as ConsumerDTO & ResponseStatus;

      expect(loggedInConsumer.__status).toBe(200);
      expect(loggedInConsumer._id).toBe(userId);
      expect(loggedInConsumer.email).toBe(consumerEmail);
    });

    it("signup with invalid 'identityType' throws 400 error", async () => {
      const consumerEmail = getRandomEmail("test+consumer");
      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: consumerEmail,
          identityType: "CONSUMR" as any,
        }),
      );
      const loginResponse = await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: consumerEmail,
          identityType: "CONSUMR" as any,
        },
      });
      expect(loginResponse.__status).toBe(400);
    });
  });

  describe("NobaAdmin login", () => {
    it("shouldn't be successful for an unregistered NobaAdmin", async () => {
      const nobaAdminEmail = getRandomEmail("test.noba.admin");
      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        }),
      );
      const loginResponse = (await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        },
      })) as any & ResponseStatus;

      expect(loginResponse.__status).toBe(403);
    });

    it("shouldn't be successful for a SignedUp Consumer with same email", async () => {
      const consumerEmail = getRandomEmail("consumer");
      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: consumerEmail,
          identityType: "CONSUMER",
        }),
      );
      const consumerLoginResponse = await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: consumerEmail,
          identityType: "CONSUMER",
        },
      });
      expect(consumerLoginResponse.__status).toBe(201);

      const adminWithSameConsumerEmailLogin = await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: consumerEmail,
          identityType: "NOBA_ADMIN",
        },
      });
      expect(adminWithSameConsumerEmailLogin.__status).toBe(403);
    });

    it("shouldn't be successful for a SignedUp PartnerAdmin with same email", async () => {
      const partnerAdminEmail = getRandomEmail("test.partner.admin");

      expect(
        await insertPartnerAdmin(mongoUri, partnerAdminEmail, getRandomID("PAPAPAPAPA"), "BASIC", "PPPPPPPPPP"),
      ).toBe(true);
      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: partnerAdminEmail,
          identityType: "NOBA_ADMIN",
        }),
      );
      const adminWithSamePartnerAdminEmailLogin = await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: partnerAdminEmail,
          identityType: "NOBA_ADMIN",
        },
      });
      expect(adminWithSamePartnerAdminEmailLogin.__status).toBe(403);
    });

    it("shouldn't be successful if PartnerAdmin with same email just generates an OTP", async () => {
      const partnerAdminEmail = getRandomEmail("test.partner.admin");

      expect(
        await insertPartnerAdmin(mongoUri, partnerAdminEmail, getRandomID("PAPAPAPAPA"), "BASIC", "PPPPPPPPPP"),
      ).toBe(true);

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: partnerAdminEmail,
          identityType: "PARTNER_ADMIN",
        }),
      );
      const partnerAdminLogin = await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: partnerAdminEmail,
          identityType: "PARTNER_ADMIN",
        },
      });
      expect(partnerAdminLogin.__status).toBe(201);

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/verifyotp",
        JSON.stringify({
          emailOrPhone: partnerAdminEmail,
          otp: await fetchOtpFromDb(mongoUri, partnerAdminEmail, "PARTNER_ADMIN"),
          identityType: "NOBA_ADMIN",
        }),
      );

      const nobaAdminVerifyOtpResponse = (await AuthenticationService.verifyOtp({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: partnerAdminEmail,
          otp: await fetchOtpFromDb(mongoUri, partnerAdminEmail, "PARTNER_ADMIN"),
          identityType: "NOBA_ADMIN",
        },
      })) as VerifyOtpResponseDTO & ResponseStatus;

      // TODO: Fix the 'verifyOtp' to return 403 instead of 404.
      expect(nobaAdminVerifyOtpResponse.__status).toBe(404);
    });

    it("should be successful for registered NobaAdmin", async () => {
      const nobaAdminEmail = getRandomEmail("test.noba.admin");

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        }),
      );

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, getRandomID("AAAAAAAAAA"), "BASIC")).toBe(true);

      const loginResponse = (await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        },
      })) as any & ResponseStatus;

      expect(loginResponse.__status).toBe(201);

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/verifyotp",
        JSON.stringify({
          emailOrPhone: nobaAdminEmail,
          otp: await fetchOtpFromDb(mongoUri, nobaAdminEmail, "NOBA_ADMIN"),
          identityType: "NOBA_ADMIN",
        }),
      );

      const verifyOtpResponse = (await AuthenticationService.verifyOtp({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: nobaAdminEmail,
          otp: await fetchOtpFromDb(mongoUri, nobaAdminEmail, "NOBA_ADMIN"),
          identityType: "NOBA_ADMIN",
        },
      })) as VerifyOtpResponseDTO & ResponseStatus;

      // TODO: Modify 'verifyOtp' to return 200.
      expect(verifyOtpResponse.__status).toBe(201);
    });
  });

  // TODO: Decide if same user can be associated with multiple partners & add proper tests.
  describe("PartnerAdmin login", () => {
    it("shouldn't be successful for an unregistered PartnerAdmin", async () => {
      const partnerAdminEmail = getRandomEmail("test.partner.admin");

      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: partnerAdminEmail,
          identityType: "PARTNER_ADMIN",
        }),
      );

      const loginResponse = (await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: partnerAdminEmail,
          identityType: "PARTNER_ADMIN",
        },
      })) as any & ResponseStatus;

      expect(loginResponse.__status).toBe(403);
    });

    it("shouldn't be successful for a SignedUp Consumer with same email", async () => {
      const consumerEmail = getRandomEmail("consumer");

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: consumerEmail,
          identityType: "CONSUMER",
        }),
      );

      const consumerLoginResponse = await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: consumerEmail,
          identityType: "CONSUMER",
        },
      });
      expect(consumerLoginResponse.__status).toBe(201);

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: consumerEmail,
          identityType: "PARTNER_ADMIN",
        }),
      );

      const adminWithSameConsumerEmailLogin = await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: consumerEmail,
          identityType: "PARTNER_ADMIN",
        },
      });
      expect(adminWithSameConsumerEmailLogin.__status).toBe(403);
    });

    it("shouldn't be successful for a SignedUp NobaAdmin with same email", async () => {
      const nobaAdminEmail = getRandomEmail("test.noba.admin");

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, getRandomID("AAAAAAAAAA"), "BASIC")).toBe(true);

      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: nobaAdminEmail,
          identityType: "PARTNER_ADMIN",
        }),
      );

      const adminWithSameNobaAdminEmailLogin = await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: nobaAdminEmail,
          identityType: "PARTNER_ADMIN",
        },
      });
      expect(adminWithSameNobaAdminEmailLogin.__status).toBe(403);
    });

    it("shouldn't be successful if NobaAdmin with same email just generates an OTP", async () => {
      const nobaAdminEmail = getRandomEmail("test.noba.admin");

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, getRandomID("AAAAAAAAAA"), "BASIC")).toBe(true);

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        }),
      );

      const nobaAdminLogin = await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        },
      });
      expect(nobaAdminLogin.__status).toBe(201);

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/verifyotp",
        JSON.stringify({
          emailOrPhone: nobaAdminEmail,
          otp: await fetchOtpFromDb(mongoUri, nobaAdminEmail, "NOBA_ADMIN"),
          identityType: "PARTNER_ADMIN",
        }),
      );

      const partnerAdminVerifyOtpResponse = (await AuthenticationService.verifyOtp({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: nobaAdminEmail,
          otp: await fetchOtpFromDb(mongoUri, nobaAdminEmail, "NOBA_ADMIN"),
          identityType: "PARTNER_ADMIN",
        },
      })) as VerifyOtpResponseDTO & ResponseStatus;

      // TODO: Fix the 'verifyOtp' to return 403 instead of 404.
      expect(partnerAdminVerifyOtpResponse.__status).toBe(404);
    });

    it("should be successful for registered PartnerAdmin", async () => {
      const partnerAdminEmail = getRandomEmail("test.partner.admin");

      expect(
        await insertPartnerAdmin(mongoUri, partnerAdminEmail, getRandomID("PAPAPAPAPA"), "BASIC", "PPPPPPPPPP"),
      ).toBe(true);

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: partnerAdminEmail,
          identityType: "PARTNER_ADMIN",
        }),
      );

      const loginResponse = (await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          email: partnerAdminEmail,
          identityType: "PARTNER_ADMIN",
        },
      })) as any & ResponseStatus;

      expect(loginResponse.__status).toBe(201);

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/verifyotp",
        JSON.stringify({
          emailOrPhone: partnerAdminEmail,
          otp: await fetchOtpFromDb(mongoUri, partnerAdminEmail, "PARTNER_ADMIN"),
          identityType: "PARTNER_ADMIN",
        }),
      );

      const verifyOtpResponse = (await AuthenticationService.verifyOtp({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: partnerAdminEmail,
          otp: await fetchOtpFromDb(mongoUri, partnerAdminEmail, "PARTNER_ADMIN"),
          identityType: "PARTNER_ADMIN",
        },
      })) as VerifyOtpResponseDTO & ResponseStatus;

      // TODO: Modify 'verifyOtp' to return 200.
      expect(verifyOtpResponse.__status).toBe(201);
    });
  });
});
