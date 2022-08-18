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
  setupPartner,
  TEST_API_KEY,
} from "./common";
import { ResponseStatus } from "./api_client/core/request";

describe("Authentication", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let app: INestApplication;
  const partnerId = "dummy-partner";
  const timestamp = "testtimestamp";

  beforeEach(async () => {
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
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await app.close();
    await mongoServer.stop();
    clearAccessTokenForNextRequests();
  });

  describe("SignUp or Login as CONSUMER", () => {
    it("should be successful", async () => {
      const consumerEmail = "test+consumer@noba.com";

      const loginRequestBody: LoginRequestDTO = {
        email: consumerEmail,
        identityType: "CONSUMER",
      };

      const loginSignature = computeSignature(timestamp, "POST", "/v1/auth/login", JSON.stringify(loginRequestBody));

      const loginResponse = await AuthenticationService.loginUser(
        TEST_API_KEY,
        timestamp,
        loginSignature,
        loginRequestBody,
      );
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

      const verifyOtpResponse = (await AuthenticationService.verifyOtp(
        TEST_API_KEY,
        timestamp,
        verifyOtpSignature,
        verifyOtpRequestBody,
      )) as VerifyOtpResponseDTO & ResponseStatus;
      console.log(verifyOtpResponse);

      const accessToken = verifyOtpResponse.access_token;
      const userId = verifyOtpResponse.user_id;

      expect(verifyOtpResponse.__status).toBe(201);
      expect(accessToken).toBeDefined();
      expect(userId).toBeDefined();

      setAccessTokenForTheNextRequests(accessToken);

      const getConsumerSignature = computeSignature(timestamp, "GET", "/v1/consumers", JSON.stringify({}));
      const loggedInConsumer = (await ConsumerService.getConsumer(
        TEST_API_KEY,
        getConsumerSignature,
        timestamp,
      )) as ConsumerDTO & ResponseStatus;

      expect(loggedInConsumer.__status).toBe(200);
      expect(loggedInConsumer._id).toBe(userId);
      expect(loggedInConsumer.email).toBe(consumerEmail);
    });

    it("should be successful with different cases", async () => {
      const consumerEmail = "Test+Consumer@noba.com";
      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: consumerEmail,
          identityType: "CONSUMER",
        }),
      );

      await AuthenticationService.loginUser(TEST_API_KEY, timestamp, signature, {
        email: consumerEmail,
        identityType: "CONSUMER",
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

      (await AuthenticationService.verifyOtp(TEST_API_KEY, timestamp, signature, {
        emailOrPhone: consumerEmail,
        otp: await fetchOtpFromDb(mongoUri, consumerEmail, "CONSUMER"),
        identityType: "CONSUMER",
      })) as VerifyOtpResponseDTO & ResponseStatus;

      const newRequestConsumerEmail = "test+consumer@noba.com";

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: consumerEmail,
          identityType: "CONSUMER",
        }),
      );

      const loginResponse = await AuthenticationService.loginUser(TEST_API_KEY, timestamp, signature, {
        email: consumerEmail,
        identityType: "CONSUMER",
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

      const verifyOtpResponse = (await AuthenticationService.verifyOtp(TEST_API_KEY, timestamp, signature, {
        emailOrPhone: consumerEmail,
        otp: await fetchOtpFromDb(mongoUri, consumerEmail, "CONSUMER"),
        identityType: "CONSUMER",
      })) as VerifyOtpResponseDTO & ResponseStatus;
      console.log(verifyOtpResponse);

      const accessToken = verifyOtpResponse.access_token;
      const userId = verifyOtpResponse.user_id;

      expect(verifyOtpResponse.__status).toBe(201);
      expect(accessToken).toBeDefined();
      expect(userId).toBeDefined();

      setAccessTokenForTheNextRequests(accessToken);

      const getConsumerSignature = computeSignature(timestamp, "GET", "/v1/consumers", JSON.stringify({}));
      const loggedInConsumer = (await ConsumerService.getConsumer(
        TEST_API_KEY,
        getConsumerSignature,
        timestamp,
      )) as ConsumerDTO & ResponseStatus;

      expect(loggedInConsumer.__status).toBe(200);
      expect(loggedInConsumer._id).toBe(userId);
      expect(loggedInConsumer.email).toBe(consumerEmail);
    });

    it("signup with invalid 'identityType' throws 400 error", async () => {
      const consumerEmail = "test+consumer@noba.com";
      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: consumerEmail,
          identityType: "CONSUMR" as any,
        }),
      );
      const loginResponse = await AuthenticationService.loginUser(TEST_API_KEY, timestamp, signature, {
        email: consumerEmail,
        identityType: "CONSUMR" as any,
      });
      expect(loginResponse.__status).toBe(400);
    });
  });

  describe("NobaAdmin login", () => {
    it("shouldn't be successful for an unregistered NobaAdmin", async () => {
      const nobaAdminEmail = "test.noba.admin@noba.com";
      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        }),
      );
      const loginResponse = (await AuthenticationService.loginUser(TEST_API_KEY, timestamp, signature, {
        email: nobaAdminEmail,
        identityType: "NOBA_ADMIN",
      })) as any & ResponseStatus;

      expect(loginResponse.__status).toBe(403);
    });

    it("shouldn't be successful for a SignedUp Consumer with same email", async () => {
      const consumerEmail = "consumer@noba.com";
      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: consumerEmail,
          identityType: "CONSUMER",
        }),
      );
      const consumerLoginResponse = await AuthenticationService.loginUser(TEST_API_KEY, timestamp, signature, {
        email: consumerEmail,
        identityType: "CONSUMER",
      });
      expect(consumerLoginResponse.__status).toBe(201);

      const adminWithSameConsumerEmailLogin = await AuthenticationService.loginUser(
        TEST_API_KEY,
        timestamp,
        signature,
        {
          email: consumerEmail,
          identityType: "NOBA_ADMIN",
        },
      );
      expect(adminWithSameConsumerEmailLogin.__status).toBe(403);
    });

    it("shouldn't be successful for a SignedUp PartnerAdmin with same email", async () => {
      const partnerAdminEmail = "test.partner.admin@noba.com";

      expect(await insertPartnerAdmin(mongoUri, partnerAdminEmail, "PAPAPAPAPAPA", "BASIC", "PPPPPPPPPP")).toBe(true);
      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: partnerAdminEmail,
          identityType: "NOBA_ADMIN",
        }),
      );
      const adminWithSamePartnerAdminEmailLogin = await AuthenticationService.loginUser(
        TEST_API_KEY,
        timestamp,
        signature,
        {
          email: partnerAdminEmail,
          identityType: "NOBA_ADMIN",
        },
      );
      expect(adminWithSamePartnerAdminEmailLogin.__status).toBe(403);
    });

    it("shouldn't be successful if PartnerAdmin with same email just generates an OTP", async () => {
      const partnerAdminEmail = "test.partner.admin@noba.com";

      expect(await insertPartnerAdmin(mongoUri, partnerAdminEmail, "PAPAPAPAPAPA", "BASIC", "PPPPPPPPPP")).toBe(true);

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: partnerAdminEmail,
          identityType: "PARTNER_ADMIN",
        }),
      );
      const partnerAdminLogin = await AuthenticationService.loginUser(TEST_API_KEY, timestamp, signature, {
        email: partnerAdminEmail,
        identityType: "PARTNER_ADMIN",
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

      const nobaAdminVerifyOtpResponse = (await AuthenticationService.verifyOtp(TEST_API_KEY, timestamp, signature, {
        emailOrPhone: partnerAdminEmail,
        identityType: "NOBA_ADMIN",
        otp: await fetchOtpFromDb(mongoUri, partnerAdminEmail, "PARTNER_ADMIN"),
      })) as VerifyOtpResponseDTO & ResponseStatus;

      // TODO: Fix the 'verifyOtp' to return 403 instead of 404.
      expect(nobaAdminVerifyOtpResponse.__status).toBe(404);
    });

    it("should be successful for registered NobaAdmin", async () => {
      const nobaAdminEmail = "test.noba.admin@noba.com";

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        }),
      );

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, "AAAAAAAAAA", "BASIC")).toBe(true);

      const loginResponse = (await AuthenticationService.loginUser(TEST_API_KEY, timestamp, signature, {
        email: nobaAdminEmail,
        identityType: "NOBA_ADMIN",
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

      const verifyOtpResponse = (await AuthenticationService.verifyOtp(TEST_API_KEY, timestamp, signature, {
        emailOrPhone: nobaAdminEmail,
        identityType: "NOBA_ADMIN",
        otp: await fetchOtpFromDb(mongoUri, nobaAdminEmail, "NOBA_ADMIN"),
      })) as VerifyOtpResponseDTO & ResponseStatus;

      // TODO: Modify 'verifyOtp' to return 200.
      expect(verifyOtpResponse.__status).toBe(201);
    });
  });

  // TODO: Decide if same user can be associated with multiple partners & add proper tests.
  describe("PartnerAdmin login", () => {
    it("shouldn't be successful for an unregistered PartnerAdmin", async () => {
      const partnerAdminEmail = "test.partner.admin@noba.com";

      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: partnerAdminEmail,
          identityType: "PARTNER_ADMIN",
        }),
      );

      const loginResponse = (await AuthenticationService.loginUser(TEST_API_KEY, timestamp, signature, {
        email: partnerAdminEmail,
        identityType: "PARTNER_ADMIN",
      })) as any & ResponseStatus;

      expect(loginResponse.__status).toBe(403);
    });

    it("shouldn't be successful for a SignedUp Consumer with same email", async () => {
      const consumerEmail = "consumer@noba.com";

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: consumerEmail,
          identityType: "CONSUMER",
        }),
      );

      const consumerLoginResponse = await AuthenticationService.loginUser(TEST_API_KEY, timestamp, signature, {
        email: consumerEmail,
        identityType: "CONSUMER",
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

      const adminWithSameConsumerEmailLogin = await AuthenticationService.loginUser(
        TEST_API_KEY,
        timestamp,
        signature,
        {
          email: consumerEmail,
          identityType: "PARTNER_ADMIN",
        },
      );
      expect(adminWithSameConsumerEmailLogin.__status).toBe(403);
    });

    it("shouldn't be successful for a SignedUp NobaAdmin with same email", async () => {
      const nobaAdminEmail = "test.noba.admin@noba.com";

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, "AAAAAAAAAA", "BASIC")).toBe(true);

      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: nobaAdminEmail,
          identityType: "PARTNER_ADMIN",
        }),
      );

      const adminWithSameNobaAdminEmailLogin = await AuthenticationService.loginUser(
        TEST_API_KEY,
        timestamp,
        signature,
        {
          email: nobaAdminEmail,
          identityType: "PARTNER_ADMIN",
        },
      );
      expect(adminWithSameNobaAdminEmailLogin.__status).toBe(403);
    });

    it("shouldn't be successful if NobaAdmin with same email just generates an OTP", async () => {
      const nobaAdminEmail = "test.noba.admin@noba.com";

      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, "AAAAAAAAAA", "BASIC")).toBe(true);

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        }),
      );

      const nobaAdminLogin = await AuthenticationService.loginUser(TEST_API_KEY, timestamp, signature, {
        email: nobaAdminEmail,
        identityType: "NOBA_ADMIN",
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

      const partnerAdminVerifyOtpResponse = (await AuthenticationService.verifyOtp(TEST_API_KEY, timestamp, signature, {
        emailOrPhone: nobaAdminEmail,
        otp: await fetchOtpFromDb(mongoUri, nobaAdminEmail, "NOBA_ADMIN"),
        identityType: "PARTNER_ADMIN",
      })) as VerifyOtpResponseDTO & ResponseStatus;

      // TODO: Fix the 'verifyOtp' to return 403 instead of 404.
      expect(partnerAdminVerifyOtpResponse.__status).toBe(404);
    });

    it("should be successful for registered PartnerAdmin", async () => {
      const partnerAdminEmail = "test.partner.admin@noba.com";

      expect(await insertPartnerAdmin(mongoUri, partnerAdminEmail, "PAPAPAPAPA", "BASIC", "PPPPPPPPPP")).toBe(true);

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          email: partnerAdminEmail,
          identityType: "PARTNER_ADMIN",
        }),
      );

      const loginResponse = (await AuthenticationService.loginUser(TEST_API_KEY, timestamp, signature, {
        email: partnerAdminEmail,
        identityType: "PARTNER_ADMIN",
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

      const verifyOtpResponse = (await AuthenticationService.verifyOtp(TEST_API_KEY, timestamp, signature, {
        emailOrPhone: partnerAdminEmail,
        identityType: "PARTNER_ADMIN",
        otp: await fetchOtpFromDb(mongoUri, partnerAdminEmail, "PARTNER_ADMIN"),
      })) as VerifyOtpResponseDTO & ResponseStatus;

      // TODO: Modify 'verifyOtp' to return 200.
      expect(verifyOtpResponse.__status).toBe(201);
    });
  });
});
