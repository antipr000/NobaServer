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
import { ConsumerService } from "./api_client/services/ConsumerService";
import { ConsumerDTO } from "./api_client/models/ConsumerDTO";
import { bootstrap } from "../src/server";
import {
  clearAccessTokenForNextRequests,
  computeSignature,
  insertNobaAdmin,
  insertPartnerAdmin,
  loginAndGetResponse,
  setAccessTokenForTheNextRequests,
  setupPartner,
  TEST_API_KEY,
} from "./common";
import { ResponseStatus } from "./api_client/core/request";
import { PlaidTokenDTO } from "./api_client";
import { getRandomEmail, getRandomID } from "./TestUtils";

describe("Consumers", () => {
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

  describe("GET /consumers/paymentmethods/plaid/token", () => {
    it("should return 401 if not logged in as any identity", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/paymentmethods/plaid/token", JSON.stringify({}));
      const generatePlaidTokenResponse = (await ConsumerService.generatePlaidToken({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as PlaidTokenDTO & ResponseStatus;

      expect(generatePlaidTokenResponse.__status).toBe(401);
    });

    it("should throw 403 if PartnerAdmin identity tries to call this API", async () => {
      const partnerAdminEmail = getRandomEmail("test.partner.admin");
      expect(
        await insertPartnerAdmin(mongoUri, partnerAdminEmail, getRandomID("PAPAPAPAPA"), "BASIC", "PPPPPPPPPP"),
      ).toBe(true);

      const partnerAdminLoginResponse = await loginAndGetResponse(mongoUri, partnerAdminEmail, "PARTNER_ADMIN");
      setAccessTokenForTheNextRequests(partnerAdminLoginResponse.access_token);
      const signature = computeSignature(
        TEST_TIMESTAMP,
        "GET",
        "/v1/consumers/paymentmethods/plaid/token",
        JSON.stringify({}),
      );
      const generatePlaidTokenResponse = (await ConsumerService.generatePlaidToken({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as PlaidTokenDTO & ResponseStatus;

      expect(generatePlaidTokenResponse.__status).toBe(403);
    });

    it("should throw 403 if NobaAdmin identity tries to call this API", async () => {
      const nobaAdminEmail = getRandomEmail("test.noba.admin");
      const nobaAdminId = getRandomID("AAAAAAAAA");
      const nobaAdminRole = "BASIC";
      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, nobaAdminId, nobaAdminRole)).toBe(true);

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "GET",
        "/v1/consumers/paymentmethods/plaid/token",
        JSON.stringify({}),
      );
      const generatePlaidTokenResponse = (await ConsumerService.generatePlaidToken({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as PlaidTokenDTO & ResponseStatus;
      expect(generatePlaidTokenResponse.__status).toBe(403);
    });

    it("should allow Consumer identity to call this API", async () => {
      const consumerEmail = getRandomEmail("test.consumer");

      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "GET",
        "/v1/consumers/paymentmethods/plaid/token",
        JSON.stringify({}),
      );
      const generatePlaidTokenResponse = (await ConsumerService.generatePlaidToken({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as PlaidTokenDTO & ResponseStatus;

      expect(generatePlaidTokenResponse.__status).toBe(200);
      expect(generatePlaidTokenResponse.token).toBeDefined();
    });
  });

  describe("GET /consumers", () => {
    it("should return 401 if not logged in as any identity", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(401);
    });

    it("should throw 403 if PartnerAdmin identity tries to call this API", async () => {
      const partnerAdminEmail = getRandomEmail("test.partner.admin");
      expect(
        await insertPartnerAdmin(mongoUri, partnerAdminEmail, getRandomID("PAPAPAPAPA"), "BASIC", "PPPPPPPPPP"),
      ).toBe(true);

      const partnerAdminLoginResponse = await loginAndGetResponse(mongoUri, partnerAdminEmail, "PARTNER_ADMIN");
      setAccessTokenForTheNextRequests(partnerAdminLoginResponse.access_token);
      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;
      expect(getConsumerResponse.__status).toBe(403);
    });

    it("should throw 403 if NobaAdmin identity tries to call this API", async () => {
      const nobaAdminEmail = getRandomEmail("test.noba.admin");
      const nobaAdminId = getRandomID("AAAAAAAAA");
      const nobaAdminRole = "BASIC";
      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, nobaAdminId, nobaAdminRole)).toBe(true);

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;
      expect(getConsumerResponse.__status).toBe(403);
    });

    it("should allow Consumer identity to call this API", async () => {
      const consumerEmail = getRandomEmail("test.consumer");

      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.email).toBe(consumerEmail);
      expect(getConsumerResponse.cryptoWallets).toHaveLength(0);
      expect(getConsumerResponse.paymentMethods).toHaveLength(0);
      expect(getConsumerResponse.kycVerificationData.kycVerificationStatus).toBe("NotSubmitted");
      expect(getConsumerResponse.documentVerificationData.documentVerificationStatus).toBe("NotRequired");
      expect(getConsumerResponse.firstName).toBeUndefined();
      expect(getConsumerResponse.lastName).toBeUndefined();
      expect(getConsumerResponse.address).toBeUndefined();
      expect(getConsumerResponse.dateOfBirth).toBeUndefined();
    });

    it("should allow signature to validate even with extra request params", async () => {
      const consumerEmail = getRandomEmail("test.consumer");

      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      const signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers?param1=12345", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.email).toBe(consumerEmail);
      expect(getConsumerResponse.cryptoWallets).toHaveLength(0);
      expect(getConsumerResponse.paymentMethods).toHaveLength(0);
      expect(getConsumerResponse.kycVerificationData.kycVerificationStatus).toBe("NotSubmitted");
      expect(getConsumerResponse.documentVerificationData.documentVerificationStatus).toBe("NotRequired");
      expect(getConsumerResponse.firstName).toBeUndefined();
      expect(getConsumerResponse.lastName).toBeUndefined();
      expect(getConsumerResponse.address).toBeUndefined();
      expect(getConsumerResponse.dateOfBirth).toBeUndefined();
    });
  });

  describe("PATCH /consumers", () => {
    it("should return 401 if not logged in as any identity", async () => {
      const signature = computeSignature(TEST_TIMESTAMP, "PATCH", "/v1/consumers", JSON.stringify({}));
      const updateConsumerResponse = (await ConsumerService.updateConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {},
      })) as ConsumerDTO & ResponseStatus;

      expect(updateConsumerResponse.__status).toBe(401);
    });

    it("should throw 403 if PartnerAdmin identity tries to call this API", async () => {
      const partnerAdminEmail = getRandomEmail("test.partner.admin");
      expect(
        await insertPartnerAdmin(mongoUri, partnerAdminEmail, getRandomID("PAPAPAPAPA"), "BASIC", "PPPPPPPPPP"),
      ).toBe(true);

      const partnerAdminLoginResponse = await loginAndGetResponse(mongoUri, partnerAdminEmail, "PARTNER_ADMIN");
      setAccessTokenForTheNextRequests(partnerAdminLoginResponse.access_token);

      const signature = computeSignature(TEST_TIMESTAMP, "PATCH", "/v1/consumers", JSON.stringify({}));
      const updateConsumerResponse = (await ConsumerService.updateConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {},
      })) as ConsumerDTO & ResponseStatus;
      expect(updateConsumerResponse.__status).toBe(403);
    });

    it("should throw 403 if NobaAdmin identity tries to call this API", async () => {
      const nobaAdminEmail = getRandomEmail("test.noba.admin");
      const nobaAdminId = getRandomID("AAAAAAAAA");
      const nobaAdminRole = "BASIC";
      expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, nobaAdminId, nobaAdminRole)).toBe(true);

      const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, nobaAdminEmail, "NOBA_ADMIN");
      setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

      const signature = computeSignature(TEST_TIMESTAMP, "PATCH", "/v1/consumers", JSON.stringify({}));
      const updateConsumerResponse = (await ConsumerService.updateConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {},
      })) as ConsumerDTO & ResponseStatus;
      expect(updateConsumerResponse.__status).toBe(403);
    });

    it("should updates 'firstName' if Consumer identity calls this API", async () => {
      const consumerEmail = getRandomEmail("test.consumer");
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      let signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        "/v1/consumers",
        JSON.stringify({
          firstName: "FIRSTNAME",
        }),
      );
      const updateConsumerResponse = (await ConsumerService.updateConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          firstName: "FIRSTNAME",
        },
      })) as ConsumerDTO & ResponseStatus;
      expect(updateConsumerResponse.__status).toBe(200);

      signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.email).toBe(consumerEmail);
      expect(getConsumerResponse.firstName).toBe("FIRSTNAME");
      expect(getConsumerResponse.cryptoWallets).toHaveLength(0);
      expect(getConsumerResponse.paymentMethods).toHaveLength(0);
      expect(getConsumerResponse.kycVerificationData.kycVerificationStatus).toBe("NotSubmitted");
      expect(getConsumerResponse.documentVerificationData.documentVerificationStatus).toBe("NotRequired");
      expect(getConsumerResponse.lastName).toBeUndefined();
      expect(getConsumerResponse.address).toBeUndefined();
      expect(getConsumerResponse.dateOfBirth).toBeUndefined();
    });

    it("should updates 'lastName' if Consumer identity calls this API", async () => {
      const consumerEmail = getRandomEmail("test.consumer");
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      let signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        "/v1/consumers",
        JSON.stringify({
          lastName: "LASTNAME",
        }),
      );
      const updateConsumerResponse = (await ConsumerService.updateConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          lastName: "LASTNAME",
        },
      })) as ConsumerDTO & ResponseStatus;
      expect(updateConsumerResponse.__status).toBe(200);

      signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.email).toBe(consumerEmail);
      expect(getConsumerResponse.lastName).toBe("LASTNAME");
      expect(getConsumerResponse.cryptoWallets).toHaveLength(0);
      expect(getConsumerResponse.paymentMethods).toHaveLength(0);
      expect(getConsumerResponse.kycVerificationData.kycVerificationStatus).toBe("NotSubmitted");
      expect(getConsumerResponse.documentVerificationData.documentVerificationStatus).toBe("NotRequired");
      expect(getConsumerResponse.firstName).toBeUndefined();
      expect(getConsumerResponse.address).toBeUndefined();
      expect(getConsumerResponse.dateOfBirth).toBeUndefined();
    });

    it("should updates 'dateOfBirth' if Consumer identity calls this API", async () => {
      const consumerEmail = getRandomEmail("test.consumer");
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      let signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        "/v1/consumers",
        JSON.stringify({
          dateOfBirth: "1980-02-29",
        }),
      );
      const updateConsumerResponse = (await ConsumerService.updateConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          dateOfBirth: "1980-02-29",
        },
      })) as ConsumerDTO & ResponseStatus;
      expect(updateConsumerResponse.__status).toBe(200);

      signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.email).toBe(consumerEmail);
      expect(getConsumerResponse.dateOfBirth).toBe("1980-02-29");
      expect(getConsumerResponse.cryptoWallets).toHaveLength(0);
      expect(getConsumerResponse.paymentMethods).toHaveLength(0);
      expect(getConsumerResponse.kycVerificationData.kycVerificationStatus).toBe("NotSubmitted");
      expect(getConsumerResponse.documentVerificationData.documentVerificationStatus).toBe("NotRequired");
      expect(getConsumerResponse.firstName).toBeUndefined();
      expect(getConsumerResponse.lastName).toBeUndefined();
      expect(getConsumerResponse.address).toBeUndefined();
    });

    it("should fail with 400 for invalid 'dateOfBirth'", async () => {
      const consumerEmail = getRandomEmail("test.consumer");
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      const signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        "/v1/consumers",
        JSON.stringify({
          dateOfBirth: "1980-02-30",
        }),
      );
      const updateConsumerResponse = (await ConsumerService.updateConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          dateOfBirth: "1980-02-30",
        },
      })) as ConsumerDTO & ResponseStatus;
      expect(updateConsumerResponse.__status).toBe(400);
    });

    it("should updates multiple-fields at once if Consumer identity calls this API", async () => {
      const consumerEmail = getRandomEmail("test.consumer");
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      let signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        "/v1/consumers",
        JSON.stringify({
          dateOfBirth: "1980-02-29",
          lastName: "LASTNAME",
          firstName: "FIRSTNAME",
        }),
      );
      const updateConsumerResponse = (await ConsumerService.updateConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          dateOfBirth: "1980-02-29",
          lastName: "LASTNAME",
          firstName: "FIRSTNAME",
        },
      })) as ConsumerDTO & ResponseStatus;
      expect(updateConsumerResponse.__status).toBe(200);

      signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.email).toBe(consumerEmail);
      expect(getConsumerResponse.dateOfBirth).toBe("1980-02-29");
      expect(getConsumerResponse.firstName).toBe("FIRSTNAME");
      expect(getConsumerResponse.lastName).toBe("LASTNAME");
      expect(getConsumerResponse.cryptoWallets).toHaveLength(0);
      expect(getConsumerResponse.paymentMethods).toHaveLength(0);
      expect(getConsumerResponse.kycVerificationData.kycVerificationStatus).toBe("NotSubmitted");
      expect(getConsumerResponse.documentVerificationData.documentVerificationStatus).toBe("NotRequired");
      expect(getConsumerResponse.address).toBeUndefined();
    });

    it("should updates 'address' if Consumer identity calls this API", async () => {
      const consumerEmail = getRandomEmail("test.consumer");
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      let signature = computeSignature(
        TEST_TIMESTAMP,
        "PATCH",
        "/v1/consumers",
        JSON.stringify({
          address: {
            streetLine1: "Street Line 1",
            streetLine2: "Street Line 2",
            countryCode: "US",
            postalCode: "712356",
          },
        }),
      );
      const updateConsumerResponse = (await ConsumerService.updateConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          address: {
            streetLine1: "Street Line 1",
            streetLine2: "Street Line 2",
            countryCode: "US",
            postalCode: "712356",
          },
        },
      })) as ConsumerDTO & ResponseStatus;
      expect(updateConsumerResponse.__status).toBe(200);

      signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.email).toBe(consumerEmail);
      expect(getConsumerResponse.address).toStrictEqual({
        streetLine1: "Street Line 1",
        streetLine2: "Street Line 2",
        countryCode: "US",
        postalCode: "712356",
      });
      expect(getConsumerResponse.cryptoWallets).toHaveLength(0);
      expect(getConsumerResponse.paymentMethods).toHaveLength(0);
      expect(getConsumerResponse.kycVerificationData.kycVerificationStatus).toBe("NotSubmitted");
      expect(getConsumerResponse.documentVerificationData.documentVerificationStatus).toBe("NotRequired");
      expect(getConsumerResponse.firstName).toBeUndefined();
      expect(getConsumerResponse.lastName).toBeUndefined();
      expect(getConsumerResponse.dateOfBirth).toBeUndefined();
    });
  });

  describe("POST /consumers/paymentmethods", () => {
    // it("should return 401 if not logged in as any identity", async () => {
    //   const signature = computeSignature(TEST_TIMESTAMP, "POST", "/v1/consumers/paymentmethods", JSON.stringify({}));
    //   const addPaymentMethodResponse = (await ConsumerService.addPaymentMethod({
    //     xNobaApiKey: TEST_API_KEY,
    //     xNobaSignature: signature,
    //     xNobaTimestamp: TEST_TIMESTAMP,
    //     requestBody: {} as any,
    //   })) as ConsumerDTO & ResponseStatus;

    //   expect(addPaymentMethodResponse.__status).toBe(401);
    // });

    // it("should throw 403 if PartnerAdmin identity tries to call this API", async () => {
    //   const partnerAdminEmail = "test.partner.admin@noba.com";
    //   expect(await insertPartnerAdmin(mongoUri, partnerAdminEmail, "PAPAPAPAPA", "BASIC", "PPPPPPPPPP")).toBe(true);

    //   const partnerAdminLoginResponse = await loginAndGetResponse(mongoUri, partnerAdminEmail, "PARTNER_ADMIN");
    //   setAccessTokenForTheNextRequests(partnerAdminLoginResponse.access_token);

    //   const signature = computeSignature(TEST_TIMESTAMP, "POST", "/v1/consumers/paymentmethods", JSON.stringify({}));
    //   const addPaymentMethodResponse = (await ConsumerService.addPaymentMethod({
    //     xNobaApiKey: TEST_API_KEY,
    //     xNobaSignature: signature,
    //     xNobaTimestamp: TEST_TIMESTAMP,
    //     requestBody: {} as any,
    //   })) as ConsumerDTO & ResponseStatus;
    //   expect(addPaymentMethodResponse.__status).toBe(403);
    // });

    // it("should throw 403 if NobaAdmin identity tries to call this API", async () => {
    //   const nobaAdminEmail = "test.noba.admin@noba.com";
    //   const nobaAdminId = "AAAAAAAAAA";
    //   const nobaAdminRole = "BASIC";
    //   expect(await insertNobaAdmin(mongoUri, nobaAdminEmail, nobaAdminId, nobaAdminRole)).toBe(true);

    //   const nobaAdminLoginResponse = await loginAndGetResponse(mongoUri, nobaAdminEmail, "NOBA_ADMIN");
    //   setAccessTokenForTheNextRequests(nobaAdminLoginResponse.access_token);

    //   const signature = computeSignature(TEST_TIMESTAMP, "POST", "/v1/consumers/paymentmethods", JSON.stringify({}));
    //   const addPaymentMethodResponse = (await ConsumerService.addPaymentMethod({
    //     xNobaApiKey: TEST_API_KEY,
    //     xNobaSignature: signature,
    //     xNobaTimestamp: TEST_TIMESTAMP,
    //     requestBody: {} as any,
    //   })) as ConsumerDTO & ResponseStatus;
    //   expect(addPaymentMethodResponse.__status).toBe(403);
    // });

    // TODO: Enable this test when the service is fixed to throw 400 instead of 500
    //
    // it("should throw 400 if given card details are invalid when Consumer identity calls the API", async () => {
    //   const consumerEmail = "test.consumer@noba.com";
    //   const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
    //   setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

    //   const addPaymentMethodResponse = (await ConsumerService.addPaymentMethod({
    //     cardName: "Tester",
    //     cardType: "American Express",
    //     cardNumber: "2222400070000005",
    //     expiryMonth: 30,
    //     expiryYear: 2030,
    //     cvv: "737",
    //   })) as ConsumerDTO & ResponseStatus;

    //   expect(addPaymentMethodResponse.__status).toBe(400);
    // });

    it("should successfully add the payment method when Consumer identity calls the API", async () => {
      const consumerEmail = getRandomEmail("test.consumer");
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      let signature = computeSignature(
        TEST_TIMESTAMP,
        "POST",
        "/v1/consumers/paymentmethods",
        JSON.stringify({
          type: "CARD",
          name: "Tester",
          cardDetails: {
            cardNumber: "4242424242424242",
            expiryMonth: 3,
            expiryYear: 2030,
            cvv: "737",
          },
        }),
      );
      const addPaymentMethodResponse = (await ConsumerService.addPaymentMethod({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          type: "CARD",
          name: "Tester",
          cardDetails: {
            cardNumber: "4242424242424242",
            expiryMonth: 3,
            expiryYear: 2030,
            cvv: "737",
          },
        },
      })) as ConsumerDTO & ResponseStatus;
      expect(addPaymentMethodResponse.__status).toBe(201);

      signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);
      expect(getConsumerResponse.email).toBe(consumerEmail);

      expect(getConsumerResponse.paymentMethods).toHaveLength(1);
      const addedCardDetails = getConsumerResponse.paymentMethods[0];
      expect(addedCardDetails.paymentToken).toBeDefined();
      // TODO: Enable this test once the service is fixed.
      // expect(addedCardDetails.cardType).toBe("Mastercard");
      expect(addedCardDetails.name).toBe("Tester");

      expect(getConsumerResponse.cryptoWallets).toHaveLength(0);
      expect(getConsumerResponse.kycVerificationData.kycVerificationStatus).toBe("NotSubmitted");
      expect(getConsumerResponse.documentVerificationData.documentVerificationStatus).toBe("NotRequired");
      expect(getConsumerResponse.firstName).toBeUndefined();
      expect(getConsumerResponse.lastName).toBeUndefined();
      expect(getConsumerResponse.address).toBeUndefined();
      expect(getConsumerResponse.dateOfBirth).toBeUndefined();
    });

    it("should allow addition of payment method when cardName is not provided", async () => {
      const consumerEmail = getRandomEmail("test.consumer");
      const consumerLoginResponse = await loginAndGetResponse(mongoUri, consumerEmail, "CONSUMER");
      setAccessTokenForTheNextRequests(consumerLoginResponse.access_token);

      let signature = computeSignature(
        TEST_TIMESTAMP,
        "POST",
        "/v1/consumers/paymentmethods",
        JSON.stringify({
          type: "CARD",
          cardDetails: {
            cardNumber: "4242424242424242",
            expiryMonth: 3,
            expiryYear: 2030,
            cvv: "737",
          },
        }),
      );
      const addPaymentMethodResponse = (await ConsumerService.addPaymentMethod({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
        requestBody: {
          type: "CARD",
          cardDetails: {
            cardNumber: "4242424242424242",
            expiryMonth: 3,
            expiryYear: 2030,
            cvv: "737",
          },
        },
      })) as ConsumerDTO & ResponseStatus;
      expect(addPaymentMethodResponse.__status).toBe(201);

      signature = computeSignature(TEST_TIMESTAMP, "GET", "/v1/consumers", JSON.stringify({}));
      const getConsumerResponse = (await ConsumerService.getConsumer({
        xNobaApiKey: TEST_API_KEY,
        xNobaSignature: signature,
        xNobaTimestamp: TEST_TIMESTAMP,
      })) as ConsumerDTO & ResponseStatus;

      expect(getConsumerResponse.__status).toBe(200);

      expect(getConsumerResponse.paymentMethods).toHaveLength(1);
      const addedCardDetails = getConsumerResponse.paymentMethods[0];
      expect(addedCardDetails.paymentToken).toBeDefined();
    });
  });
});
