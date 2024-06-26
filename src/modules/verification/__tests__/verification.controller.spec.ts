import { TestingModule, Test } from "@nestjs/testing";
import { instance, when } from "ts-mockito";
import { VerificationController } from "../verification.controller";
import { VerificationService } from "../verification.service";
import { getMockVerificationServiceWithDefaults } from "../mocks/mock.verification.service";
import { VerificationData } from "../domain/VerificationData";
import { ConsumerInformation } from "../domain/ConsumerInformation";
import { Consumer } from "../../consumer/domain/Consumer";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { NotFoundException } from "@nestjs/common";
import { IDVerificationURLRequestLocale, IDVerificationURLResponseDTO } from "../dto/IDVerificationRequestURLDTO";
import { DocumentVerificationState } from "../../../modules/consumer/domain/ExternalStates";
import { DocumentVerificationStatus, KYCProvider, KYCStatus } from "@prisma/client";

describe("VerificationController", () => {
  let verificationController: VerificationController;
  let verificationService: VerificationService;

  jest.setTimeout(30000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
    };

    verificationService = getMockVerificationServiceWithDefaults();

    const VerificationServiceProvider = {
      provide: VerificationService,
      useFactory: () => instance(verificationService),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [VerificationController],
      providers: [VerificationServiceProvider],
    }).compile();

    verificationController = app.get<VerificationController>(VerificationController);
  });

  describe("POST /session", () => {
    it("should create session", async () => {
      when(verificationService.createSession()).thenResolve(
        VerificationData.createVerificationData({
          id: "session-code",
        }),
      );
      const result = await verificationController.createSession();
      expect(result.sessionToken).toBe("session-code");
    });
  });

  describe("POST /consumerinfo", () => {
    it("should return 'APPROVED' for consumer info verification when details are correct", async () => {
      const consumerInfo: ConsumerInformation = {
        userID: "testuser-1234",
        firstName: "Test",
        lastName: "User",
        address: {
          streetLine1: "Some random street",
          countryCode: "US",
          city: "Some random city",
          regionCode: "AL",
          postalCode: "123456",
        },
        phoneNumber: "+1234567890",
        dateOfBirth: "1990-02-12",
      };

      const consumer = Consumer.createConsumer({
        id: "testuser-1234",
        email: "test@noba.com",
      });

      when(verificationService.verifyConsumerInformation(consumerInfo.userID, "test-session")).thenResolve(
        KYCStatus.APPROVED,
      );

      const result = await verificationController.verifyConsumer("test-session", consumer);

      expect(result.status).toBe("Approved");
    });

    it("should return 'Rejected' for consumer info verification when details are not correct", async () => {
      const consumerInfo: ConsumerInformation = {
        userID: "testuser-1234",
        firstName: "Fake",
        lastName: "Name",
        address: {
          streetLine1: "Some random street",
          countryCode: "US",
          city: "Some random city",
          regionCode: "AL",
          postalCode: "123456",
        },
        phoneNumber: "+12222222222",
        dateOfBirth: "1990-02-12",
      };

      const consumer = Consumer.createConsumer({
        id: "testuser-1234",
        email: "fake@noba.com",
      });

      when(verificationService.verifyConsumerInformation(consumerInfo.userID, "test-session")).thenResolve(
        KYCStatus.REJECTED,
      );

      const result = await verificationController.verifyConsumer("test-session", consumer);

      expect(result.status).toBe("Rejected");
    });

    it("should return 'PENDING' for consumer info verification when user is flagged", async () => {
      const consumerInfo: ConsumerInformation = {
        userID: "testuser-1234",
        firstName: "Test",
        lastName: "User",
        address: {
          streetLine1: "Some random street",
          countryCode: "US",
          city: "Some random city",
          regionCode: "AL",
          postalCode: "123456",
        },
        phoneNumber: "+12222222222",
        dateOfBirth: "1990-02-12",
      };

      const consumer = Consumer.createConsumer({
        id: "testuser-1234",
        email: "shadyemail@noba.com",
      });

      when(verificationService.verifyConsumerInformation(consumerInfo.userID, "test-session")).thenResolve(
        KYCStatus.FLAGGED,
      );

      const result = await verificationController.verifyConsumer("test-session", consumer);

      expect(result.status).toBe("Pending");
    });
  });

  describe("GET /document/result/:id", () => {
    it("should throw NotFoundException if id does not belong to consumer", async () => {
      const consumer = Consumer.createConsumer({
        id: "fake-consumer",
        firstName: "Fake",
        lastName: "Consumer",
        email: "fake+consumer@noba.com",

        verificationData: {
          provider: KYCProvider.SARDINE,
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.PENDING,
          documentCheckReference: "fake-transaction-1",
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
          isSuspectedFraud: false,
        },
      });

      when(verificationService.getDocumentVerificationResult(consumer.props.id, "fake-transaction-2")).thenResolve(
        DocumentVerificationStatus.APPROVED,
      );

      try {
        await verificationController.getDocumentVerificationResult("fake-transaction-2", consumer);
        expect(true).toBe(false);
      } catch (e) {
        console.log(e);
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });

    it("should return verification response if id belongs to the consumer", async () => {
      const consumer = Consumer.createConsumer({
        id: "fake-consumer",
        firstName: "Fake",
        lastName: "Consumer",
        email: "fake+consumer@noba.com",

        verificationData: {
          provider: KYCProvider.SARDINE,
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.PENDING,
          documentCheckReference: "fake-transaction-2",
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
          isSuspectedFraud: false,
        },
      });

      when(verificationService.getDocumentVerificationResult(consumer.props.id, "fake-transaction-2")).thenResolve(
        DocumentVerificationStatus.APPROVED,
      );

      const result = await verificationController.getDocumentVerificationResult("fake-transaction-2", consumer);
      expect(result.status).toBe(DocumentVerificationState.VERIFIED);
    });
  });

  describe("GET /document/url", () => {
    it("should get the URL for redirect to identity verification", async () => {
      const consumer = Consumer.createConsumer({
        id: "fake-consumer-1234",
        email: "fake+consumer@noba.com",
        firstName: "Fake",
        lastName: "Consumer",

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

      const id = "request-id";
      const url = "http://id-verification-url";
      const expiration = new Date().toISOString();
      when(
        verificationService.getDocumentVerificationURL(
          "session-id",
          consumer.props.id,
          IDVerificationURLRequestLocale.EN_US,
          true,
          true,
          true,
        ),
      ).thenResolve({
        id: id,
        link: {
          expiredAt: expiration,
          url: url,
        },
      });

      const expectedResult: IDVerificationURLResponseDTO = {
        id: id,
        expiration: Date.parse(expiration),
        url: url,
      };

      const result = await verificationController.getIdentityDocumentVerificationURL(
        consumer,
        "session-id",
        IDVerificationURLRequestLocale.EN_US,
        "true",
        "true",
        "true",
      );
      expect(result).toStrictEqual(expectedResult);
    });

    it("should use default false values for the booleans if not provided", async () => {
      const consumer = Consumer.createConsumer({
        id: "fake-consumer-1234",
        email: "fake+consumer@noba.com",
        firstName: "Fake",
        lastName: "Consumer",

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

      const id = "request-id";
      const url = "http://id-verification-url";
      const expiration = new Date().toISOString();
      when(
        verificationService.getDocumentVerificationURL(
          "session-id",
          consumer.props.id,
          IDVerificationURLRequestLocale.EN_US,
          false,
          false,
          false,
        ),
      ).thenResolve({
        id: id,
        link: {
          expiredAt: expiration,
          url: url,
        },
      });

      const expectedResult: IDVerificationURLResponseDTO = {
        id: id,
        expiration: Date.parse(expiration),
        url: url,
      };

      const result = await verificationController.getIdentityDocumentVerificationURL(
        consumer,
        "session-id",
        IDVerificationURLRequestLocale.EN_US,
      );
      expect(result).toStrictEqual(expectedResult);
    });
  });
});
