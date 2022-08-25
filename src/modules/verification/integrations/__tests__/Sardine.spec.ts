import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { ConsumerInformation } from "../../domain/ConsumerInformation";
import { Sardine } from "../Sardine";
import mockAxios from "jest-mock-axios";
import {
  DocumentVerificationStatus,
  KYCStatus,
  RiskLevel,
  WalletStatus,
} from "../../../../modules/consumer/domain/VerificationStatus";
import {
  FAKE_DEVICE_INFORMATION_RESPONSE,
  FAKE_DOCUMENT_SUBMISSION_RESPONSE,
  FAKE_DOCUMENT_VERIFiCATION_APPROVED_RESPONSE,
  FAKE_DOCUMENT_VERIFiCATION_DOCUMENT_RECAPTURE_NEEDED_RESPONSE,
  FAKE_DOCUMENT_VERIFiCATION_FRAUDULENT_DOCUMENT_RESPONSE,
  FAKE_FRAUDULENT_TRANSACTION,
  FAKE_GOOD_TRANSACTION,
  FAKE_KYC_CASE_NOTIFICATION_APPROVED,
  FAKE_KYC_CASE_NOTIFICATION_IN_PROGRESS_STATE,
  FAKE_KYC_CASE_NOTIFICATION_REJECTED,
  KYC_SSN_HIGH_RISK,
  KYC_SSN_LOW_RISK,
  KYC_SSN_VERY_HIGH_RISK,
} from "../fakes/FakeSardineResponses";
import { TransactionInformation } from "../../domain/TransactionInformation";
import { Consumer } from "../../../../modules/consumer/domain/Consumer";
import { VerificationProviders } from "../../../../modules/consumer/domain/VerificationData";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DocumentInformation } from "../../domain/DocumentInformation";
import { DocumentTypes } from "../../domain/DocumentTypes";
import { Express } from "express";
// eslint-disable-next-line unused-imports/no-unused-imports
import { Multer } from "multer";
import { Readable } from "stream";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../../domain/VerificationResult";

//TODO: Add assertions for request body
describe("SardineTests", () => {
  jest.setTimeout(10000);
  let sardine: Sardine;
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          sardine: {
            sardineBaseUri: "http://localhost:8080/sardine",
            clientID: "test-client-id",
            secretKey: "test-secret-key",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [Sardine],
    }).compile();

    sardine = app.get<Sardine>(Sardine);
  });

  describe("verifyConsumerInformation", () => {
    afterEach(() => {
      mockAxios.reset();
    });

    it("Should return status APPROVED if risk level is 'low'", async () => {
      const consumerInformation: ConsumerInformation = {
        userID: "test-user-1234",
        firstName: "Test",
        lastName: "User",
        address: {
          streetLine1: "Test street",
          streetLine2: "Test street line 2",
          countryCode: "US",
          city: "CA",
          regionCode: "RC",
          postalCode: "123456",
        },
        dateOfBirth: "1860-03-03",
        email: "test+user@noba.com",
      };

      const responsePromise = sardine.verifyConsumerInformation(KYC_SSN_LOW_RISK.data.sessionKey, consumerInformation);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockResponse(KYC_SSN_LOW_RISK);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.APPROVED);
      expect(response.idvProviderRiskLevel).toBe("low");
    });

    it("Should return status PENDING and riskLevel high if sardine response risk level is high", async () => {
      const consumerInformation: ConsumerInformation = {
        userID: "test-user-1234",
        firstName: "Test",
        lastName: "User",
        address: {
          streetLine1: "Fake street",
          streetLine2: "Fake street 2",
          countryCode: "US",
          city: "CA",
          regionCode: "RC",
          postalCode: "123456",
        },
        dateOfBirth: "1860-03-03",
        email: "fake-user@fake.com",
      };

      const responsePromise = sardine.verifyConsumerInformation(KYC_SSN_HIGH_RISK.data.sessionKey, consumerInformation);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockResponse(KYC_SSN_HIGH_RISK);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.PENDING);
      expect(response.idvProviderRiskLevel).toBe("high");
    });

    it("Should return status REJECTED and riskLevel very_high if sardine response risk level is very_high", async () => {
      const consumerInformation: ConsumerInformation = {
        userID: "test-user-1234",
        firstName: "Test",
        lastName: "User",
        address: {
          streetLine1: "Fake street",
          streetLine2: "Fake street 2",
          countryCode: "US",
          city: "CA",
          regionCode: "RC",
          postalCode: "123456",
        },
        dateOfBirth: "1860-03-03",
        email: "fake-user@fake.com",
      };

      const responsePromise = sardine.verifyConsumerInformation(
        KYC_SSN_VERY_HIGH_RISK.data.sessionKey,
        consumerInformation,
      );
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockResponse(KYC_SSN_VERY_HIGH_RISK);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.REJECTED);
      expect(response.idvProviderRiskLevel).toBe("very_high");
    });
  });

  describe("transactionVerification", () => {
    afterEach(() => {
      mockAxios.reset();
    });

    it("Should return status APPROVED and proper levels for sanction and pep level when transaction is low risk", async () => {
      const transactionInformation: TransactionInformation = {
        transactionID: "transaction-1",
        amount: 100,
        currencyCode: "USD",
        first6DigitsOfCard: "123456",
        last4DigitsOfCard: "7890",
        cardID: "card-1234",
        cryptoCurrencyCode: "ETH",
        walletAddress: "good+wallet",
      };

      const consumer = Consumer.createConsumer({
        _id: "fake-consumer-1234",
        email: "fake+consumer@noba.com",
        partners: [
          {
            partnerID: "fake-partner",
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          verificationProvider: VerificationProviders.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
        },
      });

      const responsePromise = sardine.transactionVerification(
        FAKE_GOOD_TRANSACTION.data.sessionKey,
        consumer,
        transactionInformation,
      );

      expect(mockAxios.post).toHaveBeenCalled();

      mockAxios.mockResponse(FAKE_GOOD_TRANSACTION);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.APPROVED);
      expect(response.idvProviderRiskLevel).toBe("low");
      expect(response.pepLevel).toBe(RiskLevel.LOW);
      expect(response.sanctionLevel).toBe(RiskLevel.LOW);
      expect(response.walletStatus).toBe(WalletStatus.APPROVED);
    });

    it("should return status REJECTED with appropriate pep, sanction and wallet status for fraudulent transaction", async () => {
      const transactionInformation: TransactionInformation = {
        transactionID: "transaction-1",
        amount: 100,
        currencyCode: "USD",
        first6DigitsOfCard: "123456",
        last4DigitsOfCard: "7890",
        cardID: "card-1234",
        cryptoCurrencyCode: "ETH",
        walletAddress: "good+wallet",
      };

      const consumer = Consumer.createConsumer({
        _id: "fake-consumer-1234",
        email: "fake+consumer@noba.com",
        partners: [
          {
            partnerID: "fake-partner",
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          verificationProvider: VerificationProviders.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
        },
      });

      const responsePromise = sardine.transactionVerification(
        FAKE_FRAUDULENT_TRANSACTION.data.sessionKey,
        consumer,
        transactionInformation,
      );

      expect(mockAxios.post).toHaveBeenCalled();

      mockAxios.mockResponse(FAKE_FRAUDULENT_TRANSACTION);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.REJECTED);
      expect(response.idvProviderRiskLevel).toBe("very_high");
      expect(response.pepLevel).toBe(RiskLevel.HIGH);
      expect(response.sanctionLevel).toBe(RiskLevel.HIGH);
      expect(response.walletStatus).toBe(WalletStatus.REJECTED);
    });
  });

  describe("getDocumentVerificationResult", () => {
    afterEach(() => {
      mockAxios.reset();
    });

    it("should return status APPROVED for valid documents", async () => {
      const responsePromise = sardine.getDocumentVerificationResult(
        "fake-session-key",
        "fake-verification-id",
        "fake-consumer-if",
      );

      expect(mockAxios.get).toHaveBeenCalled();

      mockAxios.mockResponse({
        data: FAKE_DOCUMENT_VERIFiCATION_APPROVED_RESPONSE,
      });

      const result = await responsePromise;
      expect(result.status).toBe(DocumentVerificationStatus.APPROVED);
    });

    it("should throw error if axios calls fail", async () => {
      mockAxios.get.mockRejectedValueOnce(new Error("Network Error"));
      const responsePromise = sardine.getDocumentVerificationResult(
        "fake-session-key",
        "fake-verification-id",
        "fake-consumer-if",
      );

      expect(mockAxios.get).toHaveBeenCalled();
      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe("verifyDocument", () => {
    afterEach(() => {
      mockAxios.reset();
    });

    it("should submit documents successfully and return verification id", async () => {
      const fileData: Express.Multer.File = {
        fieldname: "fake-field",
        originalname: "fake-name",
        encoding: "base64",
        mimetype: ".jpg",
        size: 1024,
        stream: new Readable(),
        destination: "fake-destination",
        filename: "fake-filename.jpg",
        path: "fake-path",
        buffer: Buffer.from("fake-data"),
      };
      const documentInformation: DocumentInformation = {
        userID: "fake-user",
        documentType: DocumentTypes.DRIVER_LICENSE,
        documentFrontImage: fileData,
      };

      const sessionKey = "fake-session";

      const consumer = Consumer.createConsumer({
        _id: "fake-consumer-1234",
        email: "fake+consumer@noba.com",
        firstName: "Fake",
        lastName: "Consumer",
        partners: [
          {
            partnerID: "fake-partner",
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          verificationProvider: VerificationProviders.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
        },
        address: {
          streetLine1: "Fake Street",
          streetLine2: "Fake Street Line 2",
          countryCode: "US",
          city: "Maintown",
          postalCode: "123456",
          regionCode: "CA",
        },
        dateOfBirth: "1960-12-12",
      });
      const promise = sardine.verifyDocument(sessionKey, documentInformation, consumer);

      expect(mockAxios.post).toHaveBeenCalled();

      mockAxios.mockResponse(FAKE_DOCUMENT_SUBMISSION_RESPONSE);

      const result = await promise;
      expect(result).toBe(FAKE_DOCUMENT_SUBMISSION_RESPONSE.data.id);
    });

    it("should return verification id if sardine returns status code 400", async () => {
      const fileData: Express.Multer.File = {
        fieldname: "fake-field",
        originalname: "fake-name",
        encoding: "base64",
        mimetype: ".jpg",
        size: 1024,
        stream: new Readable(),
        destination: "fake-destination",
        filename: "fake-filename.jpg",
        path: "fake-path",
        buffer: Buffer.from("fake-data"),
      };
      const documentInformation: DocumentInformation = {
        userID: "fake-user",
        documentType: DocumentTypes.DRIVER_LICENSE,
        documentFrontImage: fileData,
      };

      const sessionKey = "fake-session";

      const consumer = Consumer.createConsumer({
        _id: "fake-consumer-1234",
        email: "fake+consumer@noba.com",
        firstName: "Fake",
        lastName: "Consumer",
        partners: [
          {
            partnerID: "fake-partner",
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          verificationProvider: VerificationProviders.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
        },
        address: {
          streetLine1: "Fake Street",
          streetLine2: "Fake Street Line 2",
          countryCode: "US",
          city: "Maintown",
          postalCode: "123456",
          regionCode: "CA",
        },
        dateOfBirth: "1960-12-12",
      });
      const promise = sardine.verifyDocument(sessionKey, documentInformation, consumer);

      expect(mockAxios.post).toHaveBeenCalled();

      mockAxios.mockError({
        response: {
          status: 400,
          data: {
            verification_id: "test-id",
          },
        },
      });

      const result = await promise;
      expect(result).toBe("test-id");
    });
  });

  describe("getDeviceVerificationResult", () => {
    afterEach(() => {
      mockAxios.reset();
    });

    it("should return device verification result for particular session", async () => {
      const sessionKey = FAKE_DEVICE_INFORMATION_RESPONSE.sessionKey;
      const responsePromise = sardine.getDeviceVerificationResult(sessionKey);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockResponse({
        data: FAKE_DEVICE_INFORMATION_RESPONSE,
      });
      const result = await responsePromise;
      expect(result).toStrictEqual(FAKE_DEVICE_INFORMATION_RESPONSE);
    });

    it("should throw BadRequestException if axios call fails", async () => {
      const sessionKey = "fake-session-key";
      const responsePromise = sardine.getDeviceVerificationResult(sessionKey);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        response: {
          data: {
            message: "Network error",
          },
        },
      });
      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe("processDocumentVerificationResult", () => {
    it("should return status APPROVED when document verification response specifies low risk", async () => {
      const response = sardine.processDocumentVerificationResult(FAKE_DOCUMENT_VERIFiCATION_APPROVED_RESPONSE);
      expect(response.status).toBe(DocumentVerificationStatus.APPROVED);
      expect(response.riskRating).toBe("low");
    });

    it("should return status REJECTED when uploaded document is not proper and recapture is needed", async () => {
      const response = sardine.processDocumentVerificationResult(
        FAKE_DOCUMENT_VERIFiCATION_DOCUMENT_RECAPTURE_NEEDED_RESPONSE,
      );
      expect(response.status).toBe(DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE);
      expect(response.riskRating).toBe("high");
    });

    it("should return status PENDING when uploaded document is identified as high risk", async () => {
      const response = sardine.processDocumentVerificationResult(
        FAKE_DOCUMENT_VERIFiCATION_FRAUDULENT_DOCUMENT_RESPONSE,
      );
      expect(response.status).toBe(DocumentVerificationStatus.PENDING);
      expect(response.riskRating).toBe("high");
    });
  });

  describe("processKycVerificationWebhookResult", () => {
    it("should return KycStatus APPROVED when notification is resolved and approved", () => {
      const response = sardine.processKycVerificationWebhookResult(FAKE_KYC_CASE_NOTIFICATION_APPROVED);
      expect(response.status).toBe(KYCStatus.APPROVED);
    });

    it("should return KycStatus REJECTED when notification is resolved and declined", () => {
      const response = sardine.processKycVerificationWebhookResult(FAKE_KYC_CASE_NOTIFICATION_REJECTED);
      expect(response.status).toBe(KYCStatus.REJECTED);
    });

    it("should return KycStatus as PENDING when notification is not in-progress state", () => {
      const response = sardine.processKycVerificationWebhookResult(FAKE_KYC_CASE_NOTIFICATION_IN_PROGRESS_STATE);
      expect(response.status).toBe(KYCStatus.PENDING);
    });
  });

  describe("postCustomerFeedback", () => {
    beforeEach(() => {
      mockAxios.reset();
    });

    it("should call feedback API successfully", async () => {
      const consumerVerificationResult: ConsumerVerificationResult = {
        status: KYCStatus.APPROVED,
      };

      sardine.postConsumerFeedback("fake-session", consumerVerificationResult);
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it("should not throw error if feedback API fails", async () => {
      const consumerVerificationResult: ConsumerVerificationResult = {
        status: KYCStatus.APPROVED,
      };

      const responsePromise = sardine.postConsumerFeedback("fake-session", consumerVerificationResult);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        code: 400,
        response: {
          data: {
            message: "Network Error",
          },
        },
      });
      await responsePromise;
      expect(true).toBe(true);
    });
  });

  describe("postDocumentFeedback", () => {
    beforeEach(() => {
      mockAxios.reset();
    });

    it("should call feedback API successfully", async () => {
      const documentVerificationResult: DocumentVerificationResult = {
        status: DocumentVerificationStatus.APPROVED,
      };

      sardine.postDocumentFeedback("fake-session", documentVerificationResult);
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it("should not throw error if feedback API fails", async () => {
      const documentVerificationResult: DocumentVerificationResult = {
        status: DocumentVerificationStatus.APPROVED,
      };

      const responsePromise = sardine.postDocumentFeedback("fake-session", documentVerificationResult);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        code: 400,
        response: {
          data: {
            message: "Network Error",
          },
        },
      });
      await responsePromise;
      expect(true).toBe(true);
    });
  });

  describe("postTransactionFeedback", () => {
    beforeEach(() => {
      mockAxios.reset();
    });

    it("should call feedback API successfully", async () => {
      sardine.postTransactionFeedback("fake-session", "fake-error", "Fake Error", "fake-transaction", "checkout");
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it("should not throw error if feedback API fails", async () => {
      const responsePromise = sardine.postTransactionFeedback(
        "fake-session",
        "fake-error",
        "Fake Error",
        "fake-transaction",
        "checkout",
      );
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        code: 400,
        response: {
          data: {
            message: "Network Error",
          },
        },
      });
      await responsePromise;
      expect(true).toBe(true);
    });
  });
});
