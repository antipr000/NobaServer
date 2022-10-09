import { TestingModule, Test } from "@nestjs/testing";
import { deepEqual, instance, when } from "ts-mockito";
import { VerificationController } from "../verification.controller";
import { VerificationService } from "../verification.service";
import { getMockVerificationServiceWithDefaults } from "../mocks/mock.verification.service";
import { VerificationData } from "../domain/VerificationData";
import { ConsumerInformation } from "../domain/ConsumerInformation";
import { DocumentVerificationStatus, KYCStatus } from "../../consumer/domain/VerificationStatus";
import { Consumer, ConsumerProps } from "../../consumer/domain/Consumer";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { VerificationProviders } from "../../../modules/consumer/domain/VerificationData";
import { NotFoundException } from "@nestjs/common";
import { AuthenticatedUser } from "src/modules/auth/domain/AuthenticatedUser";

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
          _id: "session-code",
        }),
      );
      const result = await verificationController.createSession();
      expect(result).toBe("session-code");
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
        email: "test@noba.com",
      };

      const consumer: ConsumerProps = {
        _id: "testuser-1234",
        email: "test@noba.com",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      };

      when(
        verificationService.verifyConsumerInformation(
          consumerInfo.userID,
          "test-session",
          deepEqual(consumerInfo),
          "partner-1",
        ),
      ).thenResolve({
        status: KYCStatus.APPROVED,
      });

      const result = await verificationController.verifyConsumer(
        "test-session",
        {
          firstName: consumerInfo.firstName,
          lastName: consumerInfo.lastName,
          address: consumerInfo.address,
          phoneNumber: consumerInfo.phoneNumber,
          dateOfBirth: consumerInfo.dateOfBirth,
        },
        {
          user: { entity: Consumer.createConsumer(consumer), partnerId: "partner-1" } as AuthenticatedUser,
        },
      );

      expect(result.status).toBe("Approved");
    });

    it("should return 'NOT_APPROVED' for consumer info verification when details are not correct", async () => {
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
        email: "fake@noba.com",
      };

      const consumer: ConsumerProps = {
        _id: "testuser-1234",
        email: "fake@noba.com",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      };

      when(
        verificationService.verifyConsumerInformation(
          consumerInfo.userID,
          "test-session",
          deepEqual(consumerInfo),
          "partner-1",
        ),
      ).thenResolve({
        status: KYCStatus.REJECTED,
      });

      const result = await verificationController.verifyConsumer(
        "test-session",
        {
          firstName: consumerInfo.firstName,
          lastName: consumerInfo.lastName,
          address: consumerInfo.address,
          phoneNumber: consumerInfo.phoneNumber,
          dateOfBirth: consumerInfo.dateOfBirth,
        },
        {
          user: { entity: Consumer.createConsumer(consumer), partnerId: "partner-1" } as AuthenticatedUser,
        },
      );

      expect(result.status).toBe("NotApproved");
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
        email: "shadyemail@noba.com",
      };

      const consumer: ConsumerProps = {
        _id: "testuser-1234",
        email: "shadyemail@noba.com",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
      };

      when(
        verificationService.verifyConsumerInformation(
          consumerInfo.userID,
          "test-session",
          deepEqual(consumerInfo),
          "partner-1",
        ),
      ).thenResolve({
        status: KYCStatus.FLAGGED,
      });

      const result = await verificationController.verifyConsumer(
        "test-session",
        {
          firstName: consumerInfo.firstName,
          lastName: consumerInfo.lastName,
          address: consumerInfo.address,
          phoneNumber: consumerInfo.phoneNumber,
          dateOfBirth: consumerInfo.dateOfBirth,
        },
        {
          user: { entity: Consumer.createConsumer(consumer), partnerId: "partner-1" } as AuthenticatedUser,
        },
      );

      expect(result.status).toBe("Pending");
    });
  });

  describe("GET /document/result/:id", () => {
    it("should throw NotFoundException if id does not belong to consumer", async () => {
      const consumer = Consumer.createConsumer({
        _id: "fake-consumer",
        firstName: "Fake",
        lastName: "Consumer",
        email: "fake+consumer@noba.com",
        partners: [
          {
            partnerID: "fake-partner",
          },
        ],
        verificationData: {
          verificationProvider: VerificationProviders.SARDINE,
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.PENDING,
          documentVerificationTransactionID: "fake-transaction-1",
        },
      });

      when(
        verificationService.getDocumentVerificationResult(consumer.props._id, "fake-transaction-2", "partner-1"),
      ).thenResolve({
        status: DocumentVerificationStatus.APPROVED,
      });

      try {
        await verificationController.getDocumentVerificationResult("fake-transaction-2", {
          user: { entity: consumer, partnerId: "partner-1" } as AuthenticatedUser,
        });
        expect(true).toBe(false);
      } catch (e) {
        console.log(e);
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });

    it("should return verification response if id belongs to the consumer", async () => {
      const consumer = Consumer.createConsumer({
        _id: "fake-consumer",
        firstName: "Fake",
        lastName: "Consumer",
        email: "fake+consumer@noba.com",
        partners: [
          {
            partnerID: "fake-partner",
          },
        ],
        verificationData: {
          verificationProvider: VerificationProviders.SARDINE,
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.PENDING,
          documentVerificationTransactionID: "fake-transaction-2",
        },
      });

      when(
        verificationService.getDocumentVerificationResult(consumer.props._id, "fake-transaction-2", "partner-1"),
      ).thenResolve({
        status: DocumentVerificationStatus.APPROVED,
      });

      const result = await verificationController.getDocumentVerificationResult("fake-transaction-2", {
        user: { entity: consumer, partnerId: "partner-1" } as AuthenticatedUser,
      });
      expect(result.status).toBe(DocumentVerificationStatus.APPROVED);
    });
  });
});
