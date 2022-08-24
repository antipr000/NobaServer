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
});
