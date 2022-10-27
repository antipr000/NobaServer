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
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { bootstrap } from "../src/server";
import {
  clearAccessTokenForNextRequests,
  computeSignature,
  loginAndGetResponse,
  setAccessTokenForTheNextRequests,
  setupPartner,
  TEST_API_KEY,
} from "./common";
import { ResponseStatus } from "./api_client/core/request";
import {
  CaseNotificationWebhookRequestDTO,
  ConsumerDTO,
  ConsumerService,
  DeviceVerificationResponseDTO,
  DocumentVerificationWebhookRequestDTO,
  IDVerificationRequestDTO,
  UpdateConsumerRequestDTO,
  VerificationResultDTO,
  VerificationService,
  VerificationWebhooksService,
} from "./api_client";
// eslint-disable-next-line unused-imports/no-unused-imports
import { FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE } from "../src/modules/verification/integrations/fakes/FakeSardineResponses";
import crypto_ts from "crypto";
import { getRandomEmail } from "./TestUtils";

describe("Verification", () => {
  jest.setTimeout(20000);

  let mongoServer: MongoMemoryServer;
  let mongoUri: string;
  let app: INestApplication;
  let TEST_TIMESTAMP;

  beforeAll(async () => {
    const port = process.env.PORT;

    // Spin up an in-memory mongodb server
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await setupPartner(mongoUri, "dummy-partner");

    const environmentVaraibles = {
      MONGO_URI: mongoUri,
    };
    app = await bootstrap(environmentVaraibles);
    await app.listen(port);
    TEST_TIMESTAMP = new Date().getTime().toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await app.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    clearAccessTokenForNextRequests();
  });

  describe("GET /session", () => {
    beforeEach(() => {
      TEST_TIMESTAMP = new Date().getTime().toString();
    });
    it("should return sessionKey even when user is not logged in", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "POST", "/v1/verify/session", JSON.stringify({}));
      const getSessionKeyResponse = (await VerificationService.createSession({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as string & ResponseStatus;

      expect(getSessionKeyResponse.__status).toBe(201);
    });

    it("should return sessionKey when user is logged in", async () => {
      const consumerEmail = getRandomEmail("test.consumer");
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      const signature = computeSignature(TEST_TIMESTAMP, "POST", "/v1/verify/session", JSON.stringify({}));
      const getSessionKeyResponse = (await VerificationService.createSession({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as string & ResponseStatus;

      expect(getSessionKeyResponse.__status).toBe(201);
    });
  });

  it("verifies consumer information using Sardine and stores the information against the consumer record for non-US users", async () => {
    const consumerInformation: IDVerificationRequestDTO = {
      firstName: "Jo",
      lastName: "Doe",
      address: {
        streetLine1: "123 main st",
        countryCode: "IN",
        city: "hyderabad",
        regionCode: "HY",
        postalCode: "02747",
      },
      dateOfBirth: "1988-09-09",
    };

    const consumerEmail = getRandomEmail("test.consumer");
    const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
    setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

    const sessionKey = "test-session-key";

    let signature = computeSignature(
      TEST_TIMESTAMP,
      "POST",
      "/v1/verify/consumerinfo",
      JSON.stringify(consumerInformation),
    );

    const getVerifyConsumerInformationResponse = (await VerificationService.verifyConsumer({
      xNobaApiKey: TEST_API_KEY,
      xNobaSignature: signature,
      xNobaTimestamp: TEST_TIMESTAMP,
      sessionKey: sessionKey,
      requestBody: consumerInformation,
    })) as VerificationResultDTO & ResponseStatus;

    expect(getVerifyConsumerInformationResponse.__status).toBe(201);
    expect(getVerifyConsumerInformationResponse.status).toBe("Approved");

    signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
    const getConsumerResponse = (await ConsumerService.getConsumer({
      xNobaApiKey: TEST_API_KEY,
      xNobaSignature: signature,
      xNobaTimestamp: TEST_TIMESTAMP,
    })) as ConsumerDTO & ResponseStatus;

    expect(getConsumerResponse.address).toStrictEqual(consumerInformation.address);
    expect(getConsumerResponse.dateOfBirth).toBe(consumerInformation.dateOfBirth);
    expect(getConsumerResponse.kycVerificationData.kycVerificationStatus).toBe("Approved");
    expect(getConsumerResponse.documentVerificationData.documentVerificationStatus).toBe("Required");
  });

  // it("POST /verifyDocument", async () => {
  //   const fileData: Express.Multer.File = {
  //     fieldname: "fake-field",
  //     originalname: "fake-name",
  //     encoding: "base64",
  //     mimetype: ".jpg",
  //     size: 1024,
  //     stream: new Readable(),
  //     destination: "fake-destination",
  //     filename: "fake-filename.jpg",
  //     path: "fake-path",
  //     buffer: Buffer.from("fake-data"),
  //   };
  //   const sessionKey = "test-session-key";
  //   const signature = computeSignature(TEST_TIMESTAMP, "POST", "/v1/verify/consumerinfo", JSON.stringify({}));

  //   const formData = new FormData();
  //   formData.append("documentType", "driver_license");
  //   formData.append("frontImage", fileData.buffer);

  //   await VerificationService.verifyDocument({
  //     xNobaApiKey: TEST_API_KEY,
  //     xNobaSignature: signature,
  //     xNobaTimestamp: TEST_TIMESTAMP,
  //     sessionKey: sessionKey,
  //     formData: formData as any,
  //   });
  // });

  describe("GET /device/result", () => {
    beforeEach(() => {
      TEST_TIMESTAMP = new Date().getTime().toString();
    });
    it("should throw 404 error for session key that does not exist", async () => {
      const sessionKey = "test-session-key";

      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/verify/device/result", JSON.stringify({}));

      const deviceVerificationResponse = (await VerificationService.getDeviceVerificationResult({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        sessionKey: sessionKey,
      })) as DeviceVerificationResponseDTO & ResponseStatus;

      expect(deviceVerificationResponse.__status).toBe(404);
    });

    it("should return device verification result", async () => {
      const sessionKey = "xMjzKsXHebwgQccy7MbPE";

      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/verify/device/result", JSON.stringify({}));

      const deviceVerificationResponse = (await VerificationService.getDeviceVerificationResult({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        sessionKey: sessionKey,
      })) as DeviceVerificationResponseDTO & ResponseStatus;

      // This might be flaky as it depends on how long Sardine retains the record in Sandbox. Ask from Sardine some session key for testing
      expect(deviceVerificationResponse.__status).toBe(200);
      expect(deviceVerificationResponse.level).toBe("low");
      expect(deviceVerificationResponse.ipLocation).toBeTruthy();
      expect(deviceVerificationResponse.attributes).toBeTruthy();
      expect(deviceVerificationResponse.behaviorBiometrics).toBeTruthy();
    });
  });

  describe("POST /verify/webhook/document/result", () => {
    beforeEach(() => {
      TEST_TIMESTAMP = new Date().getTime().toString();
    });
    it("should update consumer documentVerificationData.status to APPROVED when verification result is low risk", async () => {
      const secretKey = "bogus-value"; // SecretKey is bogus-value in yaml for E2E test

      // Create consumer
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, getRandomEmail("fake+consumer"), "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      let getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.documentVerificationData.documentVerificationStatus).toBe("NotRequired"); // Initially it is set to NotRequired by default

      const requestBody: DocumentVerificationWebhookRequestDTO = {
        id: "fake-verification-id",
        type: "fake-type",
        timestamp: new Date().toISOString(),
        data: {
          documentVerificationResult: FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE,
          case: {
            sessionKey: "test-session-key",
            customerID: getConsumerResponse._id,
          },
          action: {
            source: "fake-source",
          },
        },
      };

      const sardineSignature = computeSardineWebhookSignature(secretKey, JSON.stringify(requestBody));

      const response = await VerificationWebhooksService.postDocumentVerificationResult({
        xSardineSignature: sardineSignature,
        requestBody: requestBody,
      });

      expect(response.__status).toBe(200);

      getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.documentVerificationData.documentVerificationStatus).toBe("Approved");
    });

    it("should throw error if signature does not match", async () => {
      const secretKey = "wrong-secret-key";
      const requestBody: DocumentVerificationWebhookRequestDTO = {
        id: "fake-verification-id",
        type: "fake-type",
        timestamp: new Date().toISOString(),
        data: {
          documentVerificationResult: FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE,
          case: {
            sessionKey: "test-session-key",
            customerID: "fake-consumer",
          },
          action: {
            source: "fake-source",
          },
        },
      };

      const sardineSignature = computeSardineWebhookSignature(secretKey, JSON.stringify(requestBody));
      const response = await VerificationWebhooksService.postDocumentVerificationResult({
        xSardineSignature: sardineSignature,
        requestBody: requestBody,
      });

      expect(response.__status).toBe(403);
    });
  });

  describe("POST /verify/case/notification", () => {
    beforeEach(() => {
      TEST_TIMESTAMP = new Date().getTime().toString();
    });
    it("should update consumer kycVerificationData.status to APPROVED when case is resolved", async () => {
      const secretKey = "bogus-value"; // SecretKey is bogus-value in yaml for E2E test

      // Create consumer
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, getRandomEmail("fake+consumer"), "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);
      let signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      let getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.kycVerificationData.kycVerificationStatus).toBe("NotSubmitted"); // Initially it is set to NotSubmitted by default

      const updateConsumerRequestBody: UpdateConsumerRequestDTO = {
        address: {
          streetLine1: "123 main st",
          countryCode: "US",
          city: "irvene",
          regionCode: "CA",
          postalCode: "02747",
        },
      };

      signature = computeSignature(TEST_TIMESTAMP, "PATCH", "/v1/consumers", JSON.stringify(updateConsumerRequestBody));

      const updateConsumerResponse = (await ConsumerService.updateConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: updateConsumerRequestBody,
      })) as ConsumerDTO & ResponseStatus;
      expect(updateConsumerResponse.__status).toBe(200);

      const requestBody: CaseNotificationWebhookRequestDTO = {
        id: "fake-id",
        type: "fake-type",
        timestamp: new Date().toISOString(),
        data: {
          action: {
            source: "fake-source",
            user_email: getConsumerResponse.email,
            value: "approve",
          },
          case: {
            sessionKey: "fake-session",
            customerID: getConsumerResponse._id,
            status: "resolved",
            checkpoint: "ssn",
            transactionID: "fake-transaction",
          },
        },
      };

      const sardineSignature = computeSardineWebhookSignature(secretKey, JSON.stringify(requestBody));

      const response = await VerificationWebhooksService.postCaseNotification({
        xSardineSignature: sardineSignature,
        requestBody: requestBody,
      });

      expect(response.__status).toBe(200);

      signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.kycVerificationData.kycVerificationStatus).toBe("Approved");
    });
  });
});

function computeSardineWebhookSignature(secretKey: string, requestBodyString: string) {
  const hmac = crypto_ts.createHmac("sha256", secretKey);
  const data = hmac.update(requestBodyString);
  const hexString = data.digest("hex");
  return hexString;
}
