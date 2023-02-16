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
import { setUpEnvironmentVariablesToLoadTheSourceCode } from "../setup";
const port: number = setUpEnvironmentVariablesToLoadTheSourceCode();

import {
  AuthenticationService,
  LoginRequestDTO,
  VerifyOtpRequestDTO,
  LoginResponseDTO,
  BlankResponseDTO,
} from "../api_client";
import { ConsumerService } from "../api_client/services/ConsumerService";
import { ConsumerDTO } from "../api_client/models/ConsumerDTO";
import { computeSignature, insertNobaAdmin, setAccessTokenForTheNextRequests, TEST_OTP, TEST_API_KEY } from "../common";
import { ResponseStatus } from "../api_client/core/request";
import { IntegrationTestUtility } from "../TestUtils";

describe("Authentication", () => {
  jest.setTimeout(20000);

  const staticOTP = TEST_OTP;

  let integrationTestUtils: IntegrationTestUtility;
  let timestamp;

  beforeAll(async () => {
    integrationTestUtils = await IntegrationTestUtility.setUp(port);
    timestamp = new Date().getTime().toString();
  });

  afterAll(async () => {
    await integrationTestUtils.tearDown();
  });

  afterEach(async () => {
    await integrationTestUtils.reset();
  });

  describe("Test Login", () => {
    it("should be successful", async () => {
      const consumerEmail = integrationTestUtils.getRandomEmail("test+consumer");
      const loginRequestBody: LoginRequestDTO = {
        emailOrPhone: consumerEmail,
        identityType: "CONSUMER",
        autoCreate: true,
      };
      const loginResponse = (await AuthenticationService.loginUser({
        requestBody: loginRequestBody,
        xNobaApiKey: TEST_API_KEY,
      })) as LoginResponseDTO & ResponseStatus;

      expect(loginResponse.__status).toBe(201);
    });
  });

  describe("SignUp or Login as CONSUMER", () => {
    it("should be successful", async () => {
      const consumerEmail = integrationTestUtils.getRandomEmail("test+consumer");

      const loginRequestBody: LoginRequestDTO = {
        emailOrPhone: consumerEmail,
        identityType: "CONSUMER",
        autoCreate: true,
      };

      const loginSignature = computeSignature(timestamp, "POST", "/v1/auth/login", JSON.stringify(loginRequestBody));

      const loginResponse = (await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: loginSignature,
        xNobaTimestamp: timestamp,
        requestBody: loginRequestBody,
      })) as LoginResponseDTO & ResponseStatus;
      expect(loginResponse.__status).toBe(201);

      const verifyOtpRequestBody: VerifyOtpRequestDTO = {
        emailOrPhone: consumerEmail,
        otp: staticOTP,
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
      })) as LoginResponseDTO & ResponseStatus;

      const accessToken = verifyOtpResponse.accessToken;
      const userId = verifyOtpResponse.userID;

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
      expect(loggedInConsumer.id).toBe(userId);
      expect(loggedInConsumer.email).toBe(consumerEmail);
    });

    it("should be successful with different cases", async () => {
      const consumerEmail = integrationTestUtils.getRandomEmail("TEsT+ConSUMer");

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          emailOrPhone: consumerEmail,
          identityType: "CONSUMER",
        }),
      );

      await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: consumerEmail,
          identityType: "CONSUMER",
        },
      });

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/verifyotp",
        JSON.stringify({
          emailOrPhone: consumerEmail,
          otp: staticOTP,
          identityType: "CONSUMER",
        }),
      );

      (await AuthenticationService.verifyOtp({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: consumerEmail,
          otp: staticOTP,
          identityType: "CONSUMER",
        },
      })) as LoginResponseDTO & ResponseStatus;

      const newRequestConsumerEmail = consumerEmail.toLowerCase();

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          emailOrPhone: consumerEmail,
          identityType: "CONSUMER",
          autoCreate: false,
        }),
      );

      const loginResponse = (await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: consumerEmail,
          identityType: "CONSUMER",
          autoCreate: false,
        },
      })) as LoginResponseDTO & ResponseStatus;
      expect(loginResponse.__status).toBe(201);

      signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/verifyotp",
        JSON.stringify({
          emailOrPhone: consumerEmail,
          otp: staticOTP,
          identityType: "CONSUMER",
        }),
      );

      const verifyOtpResponse = (await AuthenticationService.verifyOtp({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: consumerEmail,
          otp: staticOTP,
          identityType: "CONSUMER",
        },
      })) as LoginResponseDTO & ResponseStatus;

      const accessToken = verifyOtpResponse.accessToken;
      const userId = verifyOtpResponse.userID;

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
      expect(loggedInConsumer.id).toBe(userId);
      expect(loggedInConsumer.email).toBe(consumerEmail);
    });

    it("signup with invalid 'identityType' throws 400 error", async () => {
      const consumerEmail = integrationTestUtils.getRandomEmail("test+consumer");
      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          emailOrPhone: consumerEmail,
          identityType: "CONSUMR" as any,
        }),
      );
      const loginResponse = (await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: consumerEmail,
          identityType: "CONSUMR" as any,
        },
      })) as BlankResponseDTO & ResponseStatus;
      expect(loginResponse.__status).toBe(400);
    });
  });

  describe("NobaAdmin login", () => {
    it("shouldn't be successful for an unregistered NobaAdmin", async () => {
      const nobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");
      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          emailOrPhone: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        }),
      );
      const loginResponse = (await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        },
      })) as any & ResponseStatus;

      expect(loginResponse.__status).toBe(403);
    });

    it("shouldn't be successful for a SignedUp Consumer with same email", async () => {
      const consumerEmail = integrationTestUtils.getRandomEmail("consumer");
      const signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          emailOrPhone: consumerEmail,
          identityType: "CONSUMER",
        }),
      );
      const consumerLoginResponse = (await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: consumerEmail,
          identityType: "CONSUMER",
        },
      })) as BlankResponseDTO & ResponseStatus;
      expect(consumerLoginResponse.__status).toBe(201);

      const adminWithSameConsumerEmailLogin = (await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: consumerEmail,
          identityType: "NOBA_ADMIN",
        },
      })) as BlankResponseDTO & ResponseStatus;
      expect(adminWithSameConsumerEmailLogin.__status).toBe(403);
    });

    it("should be successful for registered NobaAdmin", async () => {
      const nobaAdminEmail = integrationTestUtils.getRandomEmail("test.noba.admin");

      let signature = computeSignature(
        timestamp,
        "POST",
        "/v1/auth/login",
        JSON.stringify({
          emailOrPhone: nobaAdminEmail,
          identityType: "NOBA_ADMIN",
        }),
      );

      await insertNobaAdmin("", nobaAdminEmail, integrationTestUtils.getRandomID("AAAAAAAAAA"), "BASIC");

      const loginResponse = (await AuthenticationService.loginUser({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: nobaAdminEmail,
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
          otp: staticOTP,
          identityType: "NOBA_ADMIN",
        }),
      );

      const verifyOtpResponse = (await AuthenticationService.verifyOtp({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: timestamp,
        requestBody: {
          emailOrPhone: nobaAdminEmail,
          otp: staticOTP,
          identityType: "NOBA_ADMIN",
        },
      })) as LoginResponseDTO & ResponseStatus;

      // TODO: Modify 'verifyOtp' to return 200.
      expect(verifyOtpResponse.__status).toBe(201);
    });
  });
});
