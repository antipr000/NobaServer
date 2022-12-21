import { TestingModule, Test } from "@nestjs/testing";
import { anything, deepEqual, instance, when, verify, capture } from "ts-mockito";
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
import { Consumer, ConsumerProps } from "../../../modules/consumer/domain/Consumer";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { NationalIDTypes } from "../domain/NationalIDTypes";
import { DocumentVerificationStatus, KYCStatus, KYCProvider } from "@prisma/client";
import {
  CaseAction,
  CaseNotificationWebhookRequest,
  CaseStatus,
  DocumentVerificationWebhookRequest,
  IdentityDocumentURLResponse,
} from "../integrations/SardineTypeDefinitions";
import {
  FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE,
  FAKE_DOCUMENT_VERIFICATION_DOCUMENT_RECAPTURE_NEEDED_RESPONSE,
} from "../integrations/fakes/FakeSardineResponses";
import { TransactionInformation } from "../domain/TransactionInformation";
import { Express } from "express";
// eslint-disable-next-line unused-imports/no-unused-imports
import { Multer } from "multer";
import { Readable } from "stream";
import { DocumentInformation } from "../domain/DocumentInformation";
import { DocumentTypes } from "../domain/DocumentTypes";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { getMockNotificationServiceWithDefaults } from "../../../modules/notifications/mocks/mock.notification.service";
import { NotificationEventType } from "../../../modules/notifications/domain/NotificationTypes";
import { IDVerificationURLRequestLocale } from "../dto/IDVerificationRequestURLDTO";

describe("VerificationService", () => {
  let verificationService: VerificationService;
  let verificationRepo: IVerificationDataRepo;
  let consumerService: ConsumerService;
  let idvProvider: IDVProvider;
  let notificationService: NotificationService;

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
    notificationService = getMockNotificationServiceWithDefaults();

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
      provide: NotificationService,
      useFactory: () => instance(notificationService),
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
        verificationData: {
          ...consumer.props.verificationData,
          kycCheckStatus: consumerVerificationResult.status,
          kycVerificationTimestamp: new Date(),
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          riskRating: consumerVerificationResult.idvProviderRiskLevel,
        },
        socialSecurityNumber: consumerInformation.nationalID.number,
      };

      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp
      when(idvProvider.postConsumerFeedback(sessionKey, deepEqual(consumerVerificationResult))).thenResolve();

      const result = await verificationService.verifyConsumerInformation(
        consumer.props.id,
        sessionKey,
        consumerInformation,
      );
      expect(result).toStrictEqual(consumerVerificationResult);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_KYC_APPROVED_US_EVENT,
          deepEqual({
            firstName: newConsumerData.firstName,
            lastName: newConsumerData.lastName,
            nobaUserID: newConsumerData.id,
            email: newConsumerData.email,
          }),
        ),
      ).once();
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
        verificationData: {
          ...consumer.props.verificationData,
          kycCheckStatus: consumerVerificationResult.status,
          kycVerificationTimestamp: new Date(),
          documentVerificationStatus: DocumentVerificationStatus.REQUIRED,
          riskRating: consumerVerificationResult.idvProviderRiskLevel,
        },
      };

      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp
      when(idvProvider.postConsumerFeedback(sessionKey, deepEqual(consumerVerificationResult))).thenResolve();

      const result = await verificationService.verifyConsumerInformation(
        consumer.props.id,
        sessionKey,
        consumerInformation,
      );
      expect(result).toStrictEqual(consumerVerificationResult);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT,

          deepEqual({
            firstName: newConsumerData.firstName,
            lastName: newConsumerData.lastName,
            nobaUserID: newConsumerData.id,
            email: newConsumerData.email,
          }),
        ),
      ).once();
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
        verificationData: {
          ...consumer.props.verificationData,
          kycCheckStatus: consumerVerificationResult.status,
          kycVerificationTimestamp: new Date(),
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          riskRating: consumerVerificationResult.idvProviderRiskLevel,
        },
        socialSecurityNumber: consumerInformation.nationalID.number,
      };

      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp
      when(idvProvider.postConsumerFeedback(sessionKey, deepEqual(consumerVerificationResult))).thenResolve();

      const result = await verificationService.verifyConsumerInformation(
        consumer.props.id,
        sessionKey,
        consumerInformation,
      );
      expect(result).toStrictEqual(consumerVerificationResult);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_KYC_DENIED_EVENT,

          deepEqual({
            firstName: newConsumerData.firstName,
            lastName: newConsumerData.lastName,
            nobaUserID: newConsumerData.id,
            email: newConsumerData.email,
          }),
        ),
      ).once();
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
        verificationData: {
          ...consumer.props.verificationData,
          kycCheckStatus: consumerVerificationResult.status,
          kycVerificationTimestamp: new Date(),
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          riskRating: consumerVerificationResult.idvProviderRiskLevel,
        },
        socialSecurityNumber: consumerInformation.nationalID.number,
      };

      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp

      const result = await verificationService.verifyConsumerInformation(
        consumer.props.id,
        sessionKey,
        consumerInformation,
      );
      expect(result).toStrictEqual(consumerVerificationResult);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_KYC_PENDING_OR_FLAGGED_EVENT,

          deepEqual({
            firstName: newConsumerData.firstName,
            lastName: newConsumerData.lastName,
            nobaUserID: newConsumerData.id,
            email: newConsumerData.email,
          }),
        ),
      ).once();
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

      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.getDocumentVerificationResult(verificationId)).thenResolve(documentVerificationResult);
      when(consumerService.updateConsumer(deepEqual(newConsumerProps))).thenResolve(
        Consumer.createConsumer(newConsumerProps),
      );

      const result = await verificationService.getDocumentVerificationResult(consumer.props.id, verificationId);
      expect(result.status).toBe(DocumentVerificationStatus.APPROVED);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_KYC_APPROVED_US_EVENT,

          deepEqual({
            firstName: newConsumerProps.firstName,
            lastName: newConsumerProps.lastName,
            nobaUserID: newConsumerProps.id,
            email: newConsumerProps.email,
          }),
        ),
      ).once();
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

      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.getDocumentVerificationResult(verificationId)).thenResolve(documentVerificationResult);
      when(consumerService.updateConsumer(deepEqual(newConsumerProps))).thenResolve(
        Consumer.createConsumer(newConsumerProps),
      );

      const result = await verificationService.getDocumentVerificationResult(consumer.props.id, verificationId);
      expect(result.status).toBe(DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT,

          deepEqual({
            firstName: newConsumerProps.firstName,
            lastName: newConsumerProps.lastName,
            nobaUserID: newConsumerProps.id,
            email: newConsumerProps.email,
          }),
        ),
      ).once();
    });
  });

  describe("getDocumentVerificationURL", () => {
    it("should look up the consumer and return a URL", async () => {
      const consumer = getFakeConsumerWithCountryCode("US");

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

      const sessionKey = "session-key";

      const id = "request-id";
      const timestamp = new Date().toISOString();
      const url = "http://id-verification-url";
      when(
        idvProvider.getIdentityDocumentVerificationURL(
          sessionKey,
          consumer,
          IDVerificationURLRequestLocale.EN_US,
          true,
          true,
          true,
        ),
      ).thenResolve({
        id: id,
        link: {
          expiredAt: timestamp,
          url: url,
        },
      });

      const expectedResult: IdentityDocumentURLResponse = {
        id: id,
        link: {
          expiredAt: timestamp,
          url: url,
        },
      };
      const result = await verificationService.getDocumentVerificationURL(
        sessionKey,
        consumer.props.id,
        IDVerificationURLRequestLocale.EN_US,
        true,
        true,
        true,
      );

      expect(result).toEqual(expectedResult);
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
        verificationData: {
          ...consumer.props.verificationData,
          documentVerificationStatus: documentVerificationResult.status,
          riskRating: documentVerificationResult.riskRating,
        },
      };

      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(
        idvProvider.processDocumentVerificationResult(
          deepEqual(documentVerificationWebhookRequest.documentVerificationResult),
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

      const result = await verificationService.processDocumentVerificationWebhookResult(
        documentVerificationWebhookRequest,
      );
      expect(result).toStrictEqual(documentVerificationResult);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_KYC_APPROVED_US_EVENT,

          deepEqual({
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            email: consumer.props.email,
          }),
        ),
      ).once();
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
        verificationData: {
          ...consumer.props.verificationData,
          documentVerificationStatus: documentVerificationResult.status,
          riskRating: documentVerificationResult.riskRating,
        },
      };

      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(
        idvProvider.processDocumentVerificationResult(
          deepEqual(documentVerificationWebhookRequest.documentVerificationResult),
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

      const result = await verificationService.processDocumentVerificationWebhookResult(
        documentVerificationWebhookRequest,
      );
      expect(result).toStrictEqual(documentVerificationResult);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_DOCUMENT_VERIFICATION_REJECTED_EVENT,

          deepEqual({
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            email: consumer.props.displayEmail,
          }),
        ),
      ).once();
    });
  });

  describe("transactionVerification", () => {
    it("verify transaction parameters and return ACCEPTED if Sardine doesn't flag the transaction", async () => {
      const consumer = getFakeConsumer();
      const transactionInformation = getFakeTransactionInformation();
      const sessionKey = "fake-session-key";

      const transactionVerificationResult: ConsumerVerificationResult = {
        status: KYCStatus.APPROVED,
        idvProviderRiskLevel: "fake-risk-level",
      };

      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        verificationData: {
          ...consumer.props.verificationData,
          kycCheckStatus: KYCStatus.APPROVED,
        },
      };

      const verificationData = VerificationData.createVerificationData({
        _id: sessionKey,
        transactionID: transactionInformation.transactionID,
      });

      when(
        idvProvider.transactionVerification(sessionKey, deepEqual(consumer), deepEqual(transactionInformation)),
      ).thenResolve(transactionVerificationResult);

      when(consumerService.updateConsumer(deepEqual(newConsumerData))).thenResolve(
        Consumer.createConsumer(newConsumerData),
      );

      when(verificationRepo.updateVerificationData(deepEqual(verificationData))).thenResolve(verificationData);

      const result = await verificationService.transactionVerification(sessionKey, consumer, transactionInformation);

      expect(result).toStrictEqual(transactionVerificationResult);
    });
  });

  describe("provideTransactionFeedback", () => {
    it("should post transaction feedback with appropriate parameters", async () => {
      const errorCode = "fake-error";
      const errorDescription = "Fake Error";
      const transactionID = "fake-transaction";
      const sessionKey = "fake-session";
      const processor = "checkout";

      when(verificationRepo.getSessionKeyFromFilters(deepEqual({ transactionID: transactionID }))).thenResolve(
        sessionKey,
      );

      await verificationService.provideTransactionFeedback(errorCode, errorDescription, transactionID, processor);
      verify(
        idvProvider.postTransactionFeedback(sessionKey, errorCode, errorDescription, transactionID, processor),
      ).once();
    });
  });

  describe("processKycVerificationWebhookRequest", () => {
    it("sets user verification status as APPROVED when case status is RESOLVED and action is APPROVED for US consumer", async () => {
      const consumer = getFakeConsumerWithCountryCode("US");
      const sessionKey = "fake-session";
      const caseNotificationRequest = getFakeCaseNotificationWebhookRequest(
        consumer.props.email,
        KYCStatus.APPROVED,
        sessionKey,
        consumer.props.id,
      );

      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        verificationData: {
          ...consumer.props.verificationData,
          kycCheckStatus: KYCStatus.APPROVED,
        },
      };

      const result: ConsumerVerificationResult = {
        status: KYCStatus.APPROVED,
        idvProviderRiskLevel: "fake-risk-level",
      };

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData));
      when(idvProvider.processKycVerificationWebhookResult(deepEqual(caseNotificationRequest))).thenReturn(result);

      await verificationService.processKycVerificationWebhookRequest(caseNotificationRequest);

      verify(consumerService.updateConsumer(deepEqual(newConsumerData))).once();
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_KYC_APPROVED_US_EVENT,

          deepEqual({
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            email: consumer.props.displayEmail,
          }),
        ),
      ).once();
    });

    it("sets user verification status as APPROVED when case status is RESOLVED and action is APPROVED for non-US consumer", async () => {
      const consumer = getFakeConsumerWithCountryCode("IN");
      const sessionKey = "fake-session";
      const caseNotificationRequest = getFakeCaseNotificationWebhookRequest(
        consumer.props.email,
        KYCStatus.APPROVED,
        sessionKey,
        consumer.props.id,
      );

      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        verificationData: {
          ...consumer.props.verificationData,
          kycCheckStatus: KYCStatus.APPROVED,
        },
      };

      const result: ConsumerVerificationResult = {
        status: KYCStatus.APPROVED,
        idvProviderRiskLevel: "fake-risk-level",
      };

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData));
      when(idvProvider.processKycVerificationWebhookResult(deepEqual(caseNotificationRequest))).thenReturn(result);

      await verificationService.processKycVerificationWebhookRequest(caseNotificationRequest);

      verify(consumerService.updateConsumer(deepEqual(newConsumerData))).once();

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_KYC_APPROVED_NON_US_EVENT,

          deepEqual({
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            email: consumer.props.displayEmail,
          }),
        ),
      ).once();
    });

    it("sets user verification status as REJECTED when case status is RESOLVED and action is DECLINED", async () => {
      const consumer = getFakeConsumer();
      const sessionKey = "fake-session";
      const caseNotificationRequest = getFakeCaseNotificationWebhookRequest(
        consumer.props.email,
        KYCStatus.REJECTED,
        sessionKey,
        consumer.props.id,
      );

      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        verificationData: {
          ...consumer.props.verificationData,
          kycCheckStatus: KYCStatus.REJECTED,
        },
      };

      const result: ConsumerVerificationResult = {
        status: KYCStatus.REJECTED,
        idvProviderRiskLevel: "fake-risk-level",
      };

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData));
      when(idvProvider.processKycVerificationWebhookResult(deepEqual(caseNotificationRequest))).thenReturn(result);

      await verificationService.processKycVerificationWebhookRequest(caseNotificationRequest);

      verify(consumerService.updateConsumer(deepEqual(newConsumerData))).once();
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_KYC_DENIED_EVENT,

          deepEqual({
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            email: consumer.props.email,
          }),
        ),
      ).once();
    });
  });

  describe("verifyDocument", () => {
    it("should start processing documents and return PENDING state", async () => {
      const consumer = getFakeConsumer();
      const sessionKey = "fake-session-key";
      const documentInformation = getFakeDocumentInformation(consumer);
      const verificationId = "fake-id";

      const newConsumerData: ConsumerProps = {
        ...consumer.props,
        verificationData: {
          ...consumer.props.verificationData,
          documentVerificationStatus: DocumentVerificationStatus.PENDING,
          documentVerificationTimestamp: new Date(),
          documentCheckReference: verificationId,
        },
      };

      when(consumerService.findConsumerById(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.verifyDocument(sessionKey, deepEqual(documentInformation), deepEqual(consumer))).thenResolve(
        verificationId,
      );
      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData));

      const result = await verificationService.verifyDocument(consumer.props.id, sessionKey, documentInformation);
      const updateUserArgs = capture(consumerService.updateConsumer).first()[0];

      expect(result).toBe(verificationId);

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_DOCUMENT_VERIFICATION_PENDING_EVENT,

          deepEqual({
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            email: consumer.props.email,
          }),
        ),
      ).once();

      expect(updateUserArgs.verificationData.documentVerificationStatus).toBe(DocumentVerificationStatus.PENDING);
      expect(updateUserArgs.verificationData.documentCheckReference).toBe(verificationId);
    });
  });
});

function getFakeConsumer(): Consumer {
  return Consumer.createConsumer({
    id: "fake-consumer-1234",
    firstName: "Fake",
    lastName: "Consumer",
    email: "fake+consumer@noba.com",
    displayEmail: "fake+consumer@noba.com",
    verificationData: {
      provider: KYCProvider.SARDINE,
      kycCheckStatus: KYCStatus.NOT_SUBMITTED,
      documentVerificationStatus: DocumentVerificationStatus.REQUIRED,
      documentVerificationTimestamp: new Date(),
      kycVerificationTimestamp: new Date(),
      isSuspectedFraud: false,
      consumerID: "fake-consumer-1234",
    },
  });
}

function getFakeConsumerWithCountryCode(countryCode: string): Consumer {
  const consumer = getFakeConsumer();

  return Consumer.createConsumer({
    ...consumer.props,
    address: {
      countryCode: countryCode,
      city: "Fake City",
      regionCode: "FR",
      postalCode: "123456",
      streetLine1: "Test street",
    },
  });
}

function getFakeConsumerInformation(consumer: Consumer, countryCode: string): ConsumerInformation {
  const consumerInfo: ConsumerInformation = {
    userID: consumer.props.id,
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
            customerID: consumer.props.id,
          },
        },
        documentVerificationResult: FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE,
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
            customerID: consumer.props.id,
          },
        },
        documentVerificationResult: FAKE_DOCUMENT_VERIFICATION_DOCUMENT_RECAPTURE_NEEDED_RESPONSE,
      };
  }
}

function getFakeTransactionInformation(): TransactionInformation {
  return {
    transactionID: "fake-transaction-id",
    amount: 100,
    currencyCode: "USD",
    paymentMethodID: "fake-card",
    cryptoCurrencyCode: "ETH",
    walletAddress: "fake-wallet-address",
  };
}

function getFakeCaseNotificationWebhookRequest(
  emailID: string,
  status: KYCStatus,
  sessionKey: string,
  consumerID: string,
): CaseNotificationWebhookRequest {
  return {
    id: "fake-case",
    type: "ssn",
    timestamp: new Date().toUTCString(),
    data: {
      action: {
        source: "Fake Source",
        user_email: emailID,
        value: status === KYCStatus.APPROVED ? CaseAction.APPROVE : CaseAction.DECLINE,
      },
      case: {
        sessionKey: sessionKey,
        customerID: consumerID,
        status: CaseStatus.RESOLVED,
        checkpoint: "ssn",
        transactionID: "fake-transaction",
      },
    },
  };
}

function getFakeDocumentInformation(consumer: Consumer): DocumentInformation {
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

  return {
    userID: consumer.props.id,
    documentType: DocumentTypes.DRIVER_LICENSE,
    documentFrontImage: fileData,
  };
}
