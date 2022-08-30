import { TestingModule, Test } from "@nestjs/testing";
import { anything, deepEqual, instance, when } from "ts-mockito";
import { VerificationService } from "../verification.service";
import { VerificationData } from "../domain/VerificationData";
import { IVerificationDataRepo } from "../repos/IVerificationDataRepo";
import { IDVProvider } from "../integrations/IDVProvider";
import { getMockVerificationRepoWithDefaults } from "../mocks/mock.verification.repo";
import { getMockIdvProviderIntegrationWithDefaults } from "../mocks/mock.idvprovider.integration";
import { ConsumerService } from "../../consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../consumer/mocks/mock.consumer.service";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { ConsumerInformation } from "../domain/ConsumerInformation";
import { BadRequestException } from "@nestjs/common";
import { EmailService } from "../../../modules/common/email.service";
import { getMockEmailServiceWithDefaults } from "../../../modules/common/mocks/mock.email.service";
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { DocumentVerificationStatus, KYCStatus } from "../../../modules/consumer/domain/VerificationStatus";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { NationalIDTypes } from "../domain/NationalIDTypes";
import { VerificationProviders } from "../../../modules/consumer/domain/VerificationData";
import { DocumentVerificationWebhookRequest } from "../integrations/SardineTypeDefinitions";
import {
  FAKE_DOCUMENT_VERIFiCATION_APPROVED_RESPONSE,
  FAKE_DOCUMENT_VERIFiCATION_DOCUMENT_RECAPTURE_NEEDED_RESPONSE,
} from "../integrations/fakes/FakeSardineResponses";

describe("VerificationService", () => {
  let verificationService: VerificationService;
  let verificationRepo: IVerificationDataRepo;
  let consumerService: ConsumerService;
  let idvProvider: IDVProvider;
  let emailService: EmailService;

  jest.setTimeout(30000);
  const OLD_ENV = process.env;

  beforeEach(async () => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: "development",
      CONFIGS_DIR: __dirname.split("/src")[0] + "/appconfigs",
      TruliooIDVApiKey: "UGVyZWdyaW5lX1NhbmRib3hfSURWX0FQSV8yOkNvZGVuYW1lZ29kQDEyMzQ=",
      TruliooDocVApiKey: "UGVyZWdyaW5lX1NhbmRib3hfRG9jVl9BUElfMjpDb2RlbmFtZWdvZEAxMjM0",
    };

    verificationRepo = getMockVerificationRepoWithDefaults();
    idvProvider = getMockIdvProviderIntegrationWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
    emailService = getMockEmailServiceWithDefaults();

    const verificationDataRepoProvider = {
      provide: "VerificationDataRepo",
      useFactory: () => instance(verificationRepo),
    };

    const idvIntegratorProvider = {
      provide: "IDVProvider",
      useFactory: () => instance(idvProvider),
    };

    const userServiceProvider = {
      provide: ConsumerService,
      useFactory: () => instance(consumerService),
    };

    const emailServiceProvider = {
      provide: EmailService,
      useFactory: () => instance(emailService),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          trulioo: {
            TruliooIDVApiKey: "UGVyZWdyaW5lX1NhbmRib3hfSURWX0FQSV8yOkNvZGVuYW1lZ29kQDEyMzQ=",
            TruliooDocVApiKey: "UGVyZWdyaW5lX1NhbmRib3hfRG9jVl9BUElfMjpDb2RlbmFtZWdvZEAxMjM0",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [
        verificationDataRepoProvider,
        idvIntegratorProvider,
        VerificationService,
        userServiceProvider,
        emailServiceProvider,
      ],
    }).compile();

    verificationService = app.get<VerificationService>(VerificationService);
  });

  describe("verification service tests", () => {
    it("should return session information", async () => {
      when(verificationRepo.saveVerificationData(anything())).thenResolve(
        VerificationData.createVerificationData({
          _id: "test-session",
        }),
      );

      const result = await verificationService.createSession();
      expect(result.props._id).toBe("test-session");
    });
  });

  describe("verifyConsumerInformation", () => {
    it("should throw error for invalid dateOfBirth format in verifyConsumerInformation", async () => {
      const testConsumerInformation: ConsumerInformation = {
        userID: "test-consumer-01",
        firstName: "Test",
        lastName: "Consumer",
        address: {
          streetLine1: "Test street",
          countryCode: "US",
          city: "Sunnyvale",
          regionCode: "CA",
          postalCode: "123456",
        },
        dateOfBirth: "2020-2-1",
        email: "consumer@noba.com",
      };

      try {
        await verificationService.verifyConsumerInformation(
          testConsumerInformation.userID,
          "session-1234",
          testConsumerInformation,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    it("should throw error for invalid dateOfBirth value in verifyConsumerInformation", async () => {
      const testConsumerInformation: ConsumerInformation = {
        userID: "test-consumer-01",
        firstName: "Test",
        lastName: "Consumer",
        address: {
          streetLine1: "Test street",
          countryCode: "US",
          city: "Sunnyvale",
          regionCode: "CA",
          postalCode: "123456",
        },
        dateOfBirth: "ABCD1234",
        email: "consumer@noba.com",
      };

      try {
        await verificationService.verifyConsumerInformation(
          testConsumerInformation.userID,
          "session-1234",
          testConsumerInformation,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    it("should throw error for valid dateOfBirth format but invalid date in verifyConsumerInformation", async () => {
      const testConsumerInformation: ConsumerInformation = {
        userID: "test-consumer-01",
        firstName: "Test",
        lastName: "Consumer",
        address: {
          streetLine1: "Test street",
          countryCode: "US",
          city: "Sunnyvale",
          regionCode: "CA",
          postalCode: "123456",
        },
        dateOfBirth: "2020-02-30",
        email: "consumer@noba.com",
      };

      try {
        await verificationService.verifyConsumerInformation(
          testConsumerInformation.userID,
          "session-1234",
          testConsumerInformation,
        );
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });

    it("should verify ConsumerInformation when idvProvider returns APPROVED for US user", async () => {
      const consumer = getFakeConsumer();
      const consumerInformation = getFakeConsumerInformation(consumer, "US");

      const sessionKey = "fake-session";

      const consumerVerificationResult: ConsumerVerificationResult = {
        status: KYCStatus.APPROVED,
        idvProviderRiskLevel: "fake-risk-rating",
      };

      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        address: consumerInformation.address,
        firstName: consumerInformation.firstName,
        lastName: consumerInformation.lastName,
        dateOfBirth: consumerInformation.dateOfBirth,
        phone: consumerInformation.phoneNumber,
        riskRating: consumerVerificationResult.idvProviderRiskLevel,
        verificationData: {
          ...consumer.props.verificationData,
          kycVerificationStatus: consumerVerificationResult.status,
          kycVerificationTimestamp: 1,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
        },
        socialSecurityNumber: consumerInformation.nationalID.number,
      };

      when(consumerService.findConsumerById(consumer.props._id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp
      when(idvProvider.postConsumerFeedback(sessionKey, deepEqual(consumerVerificationResult))).thenResolve();
      when(
        emailService.sendKycApprovedUSEmail(
          consumerInformation.firstName,
          consumerInformation.lastName,
          consumer.props.email,
        ),
      ).thenResolve();

      const result = await verificationService.verifyConsumerInformation(
        consumer.props._id,
        sessionKey,
        consumerInformation,
      );
      expect(result).toStrictEqual(consumerVerificationResult);
    });

    it("should verify ConsumerInformation when idvProvider returns APPROVED for non-US user", async () => {
      const consumer = getFakeConsumer();
      const consumerInformation = getFakeConsumerInformation(consumer, "IN");

      const sessionKey = "fake-session";

      const consumerVerificationResult: ConsumerVerificationResult = {
        status: KYCStatus.APPROVED,
        idvProviderRiskLevel: "fake-risk-rating",
      };

      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        address: consumerInformation.address,
        firstName: consumerInformation.firstName,
        lastName: consumerInformation.lastName,
        dateOfBirth: consumerInformation.dateOfBirth,
        phone: consumerInformation.phoneNumber,
        riskRating: consumerVerificationResult.idvProviderRiskLevel,
        verificationData: {
          ...consumer.props.verificationData,
          kycVerificationStatus: consumerVerificationResult.status,
          kycVerificationTimestamp: 1,
          documentVerificationStatus: DocumentVerificationStatus.REQUIRED,
        },
      };

      when(consumerService.findConsumerById(consumer.props._id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp
      when(idvProvider.postConsumerFeedback(sessionKey, deepEqual(consumerVerificationResult))).thenResolve();
      when(
        emailService.sendKycApprovedUSEmail(
          consumerInformation.firstName,
          consumerInformation.lastName,
          consumer.props.email,
        ),
      ).thenResolve();

      const result = await verificationService.verifyConsumerInformation(
        consumer.props._id,
        sessionKey,
        consumerInformation,
      );
      expect(result).toStrictEqual(consumerVerificationResult);
    });

    it("should return REJECTED status when Sardine marks consumerInformation as high risk and should send denied email", async () => {
      const consumer = getFakeConsumer();
      const consumerInformation = getFakeConsumerInformation(consumer, "US");

      const sessionKey = "fake-session";

      const consumerVerificationResult: ConsumerVerificationResult = {
        status: KYCStatus.REJECTED,
        idvProviderRiskLevel: "fake-risk-rating",
      };

      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        address: consumerInformation.address,
        firstName: consumerInformation.firstName,
        lastName: consumerInformation.lastName,
        dateOfBirth: consumerInformation.dateOfBirth,
        phone: consumerInformation.phoneNumber,
        riskRating: consumerVerificationResult.idvProviderRiskLevel,
        verificationData: {
          ...consumer.props.verificationData,
          kycVerificationStatus: consumerVerificationResult.status,
          kycVerificationTimestamp: 1,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
        },
        socialSecurityNumber: consumerInformation.nationalID.number,
      };

      when(consumerService.findConsumerById(consumer.props._id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp
      when(idvProvider.postConsumerFeedback(sessionKey, deepEqual(consumerVerificationResult))).thenResolve();
      when(
        emailService.sendKycDeniedEmail(
          consumerInformation.firstName,
          consumerInformation.lastName,
          consumer.props.email,
        ),
      ).thenResolve();

      const result = await verificationService.verifyConsumerInformation(
        consumer.props._id,
        sessionKey,
        consumerInformation,
      );
      expect(result).toStrictEqual(consumerVerificationResult);
    });

    it("should return PENDING status when Sardine marks consumerInformation as medium risk and should send flagged email", async () => {
      const consumer = getFakeConsumer();
      const consumerInformation = getFakeConsumerInformation(consumer, "US");

      const sessionKey = "fake-session";

      const consumerVerificationResult: ConsumerVerificationResult = {
        status: KYCStatus.FLAGGED,
        idvProviderRiskLevel: "fake-risk-rating",
      };

      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        address: consumerInformation.address,
        firstName: consumerInformation.firstName,
        lastName: consumerInformation.lastName,
        dateOfBirth: consumerInformation.dateOfBirth,
        phone: consumerInformation.phoneNumber,
        riskRating: consumerVerificationResult.idvProviderRiskLevel,
        verificationData: {
          ...consumer.props.verificationData,
          kycVerificationStatus: consumerVerificationResult.status,
          kycVerificationTimestamp: 1,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
        },
        socialSecurityNumber: consumerInformation.nationalID.number,
      };

      when(consumerService.findConsumerById(consumer.props._id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp
      when(
        emailService.sendKycPendingOrFlaggedEmail(
          consumerInformation.firstName,
          consumerInformation.lastName,
          consumer.props.email,
        ),
      ).thenResolve();

      const result = await verificationService.verifyConsumerInformation(
        consumer.props._id,
        sessionKey,
        consumerInformation,
      );
      expect(result).toStrictEqual(consumerVerificationResult);
    });
  });

  describe("getDocumentVerificationResult", () => {
    it("should set status as APPROVED when document verification succeeds", async () => {
      const consumer = getFakeConsumer();
      const verificationId = "fake-id";
      const documentVerificationResult: DocumentVerificationResult = {
        status: DocumentVerificationStatus.APPROVED,
        riskRating: "fake-rating",
      };

      const newConsumerProps: ConsumerProps = {
        ...consumer.props,
        verificationData: {
          ...consumer.props.verificationData,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
        },
      };

      when(consumerService.findConsumerById(consumer.props._id)).thenResolve(consumer);
      when(idvProvider.getDocumentVerificationResult(verificationId)).thenResolve(documentVerificationResult);
      when(consumerService.updateConsumer(deepEqual(newConsumerProps))).thenResolve(
        Consumer.createConsumer(newConsumerProps),
      );
      when(
        emailService.sendKycApprovedUSEmail(
          newConsumerProps.firstName,
          newConsumerProps.lastName,
          newConsumerProps.email,
        ),
      ).thenResolve();

      const result = await verificationService.getDocumentVerificationResult(consumer.props._id, verificationId);
      expect(result.status).toBe(DocumentVerificationStatus.APPROVED);
    });

    it("should set status as REJECTED when document verification fails because of document invalid size or type", async () => {
      const consumer = getFakeConsumer();
      const verificationId = "fake-id";
      const documentVerificationResult: DocumentVerificationResult = {
        status: DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE,
        riskRating: "fake-rating",
      };

      const newConsumerProps: ConsumerProps = {
        ...consumer.props,
        verificationData: {
          ...consumer.props.verificationData,
          documentVerificationStatus: DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE,
        },
      };

      when(consumerService.findConsumerById(consumer.props._id)).thenResolve(consumer);
      when(idvProvider.getDocumentVerificationResult(verificationId)).thenResolve(documentVerificationResult);
      when(consumerService.updateConsumer(deepEqual(newConsumerProps))).thenResolve(
        Consumer.createConsumer(newConsumerProps),
      );
      when(
        emailService.sendDocVerificationFailedTechEmail(
          newConsumerProps.firstName,
          newConsumerProps.lastName,
          newConsumerProps.email,
        ),
      ).thenResolve();

      const result = await verificationService.getDocumentVerificationResult(consumer.props._id, verificationId);
      expect(result.status).toBe(DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE);
    });
  });

  describe("processDocumentVerificationWebhookResult", () => {
    it("should return status APPROVED when document verification is successful", async () => {
      const consumer = getFakeConsumer();
      const documentVerificationWebhookRequest = getDocumentVerificationWebhookRequest(
        DocumentVerificationStatus.APPROVED,
        consumer,
      );

      const documentVerificationResult: DocumentVerificationResult = {
        status: DocumentVerificationStatus.APPROVED,
        riskRating: "fake-risk-rating",
      };

      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        riskRating: documentVerificationResult.riskRating,
        verificationData: {
          ...consumer.props.verificationData,
          documentVerificationStatus: documentVerificationResult.status,
        },
      };

      when(consumerService.findConsumerById(consumer.props._id)).thenResolve(consumer);
      when(
        idvProvider.processDocumentVerificationResult(
          deepEqual(documentVerificationWebhookRequest.data.documentVerificationResult),
        ),
      ).thenReturn(documentVerificationResult);
      when(consumerService.updateConsumer(deepEqual(newConsumerData))).thenResolve(
        Consumer.createConsumer(newConsumerData),
      );
      when(
        idvProvider.postDocumentFeedback(
          documentVerificationWebhookRequest.data.case.sessionKey,
          deepEqual(documentVerificationResult),
        ),
      ).thenResolve();
      when(
        emailService.sendKycApprovedUSEmail(consumer.props.firstName, consumer.props.lastName, consumer.props.email),
      );

      const result = await verificationService.processDocumentVerificationWebhookResult(
        documentVerificationWebhookRequest,
      );
      expect(result).toStrictEqual(documentVerificationResult);
    });

    it("should return status REJECTED_DOCUMENT_REQUIRES_RECAPTURE when document verification is rejected and needs recapture", async () => {
      const consumer = getFakeConsumer();
      const documentVerificationWebhookRequest = getDocumentVerificationWebhookRequest(
        DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE,
        consumer,
      );

      const documentVerificationResult: DocumentVerificationResult = {
        status: DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE,
        riskRating: "fake-risk-rating",
      };

      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        riskRating: documentVerificationResult.riskRating,
        verificationData: {
          ...consumer.props.verificationData,
          documentVerificationStatus: documentVerificationResult.status,
        },
      };

      when(consumerService.findConsumerById(consumer.props._id)).thenResolve(consumer);
      when(
        idvProvider.processDocumentVerificationResult(
          deepEqual(documentVerificationWebhookRequest.data.documentVerificationResult),
        ),
      ).thenReturn(documentVerificationResult);
      when(consumerService.updateConsumer(deepEqual(newConsumerData))).thenResolve(
        Consumer.createConsumer(newConsumerData),
      );
      when(
        idvProvider.postDocumentFeedback(
          documentVerificationWebhookRequest.data.case.sessionKey,
          deepEqual(documentVerificationResult),
        ),
      ).thenResolve();
      when(
        emailService.sendDocVerificationRejectedEmail(
          consumer.props.firstName,
          consumer.props.lastName,
          consumer.props.email,
        ),
      );

      const result = await verificationService.processDocumentVerificationWebhookResult(
        documentVerificationWebhookRequest,
      );
      expect(result).toStrictEqual(documentVerificationResult);
    });
  });
});

function getFakeConsumer(): Consumer {
  return Consumer.createConsumer({
    _id: "fake-consumer-1234",
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
      kycVerificationStatus: KYCStatus.NOT_SUBMITTED,
      documentVerificationStatus: DocumentVerificationStatus.REQUIRED,
    },
  });
}

function getFakeConsumerInformation(consumer: Consumer, countryCode: string): ConsumerInformation {
  const consumerInfo: ConsumerInformation = {
    userID: consumer.props._id,
    firstName: "Fake",
    lastName: "Consumer",
    address: {
      streetLine1: "Test street",
      countryCode: countryCode,
      city: "Fake City",
      regionCode: "RC",
      postalCode: "123456",
    },
    dateOfBirth: "1990-03-30",
    email: consumer.props.email,
  };

  if (countryCode === "US") {
    consumerInfo.nationalID = {
      number: "1234567890",
      type: NationalIDTypes.SOCIAL_SECURITY,
    };
  }

  return consumerInfo;
}

function getDocumentVerificationWebhookRequest(
  status: DocumentVerificationStatus,
  consumer: Consumer,
): DocumentVerificationWebhookRequest {
  switch (status) {
    case DocumentVerificationStatus.APPROVED:
      return {
        id: "fake-id",
        type: "fake-type",
        timestamp: new Date().toUTCString(),
        data: {
          action: {
            source: "fake-source",
          },
          case: {
            sessionKey: "fake-session-key",
            customerID: consumer.props._id,
          },
          documentVerificationResult: FAKE_DOCUMENT_VERIFiCATION_APPROVED_RESPONSE,
        },
      };
    case DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE:
      return {
        id: "fake-id",
        type: "fake-type",
        timestamp: new Date().toUTCString(),
        data: {
          action: {
            source: "fake-source",
          },
          case: {
            sessionKey: "fake-session-key",
            customerID: consumer.props._id,
          },
          documentVerificationResult: FAKE_DOCUMENT_VERIFiCATION_DOCUMENT_RECAPTURE_NEEDED_RESPONSE,
        },
      };
  }
}
