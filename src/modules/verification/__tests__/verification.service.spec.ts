import { TestingModule, Test } from "@nestjs/testing";
import { anything, deepEqual, instance, when, verify, capture, anyString } from "ts-mockito";
import { VerificationService } from "../verification.service";
import { VerificationData } from "../domain/VerificationData";
import { IVerificationDataRepo } from "../repos/verificationdata.repo";
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
import { DocumentVerificationStatus, KYCStatus, KYCProvider } from "@prisma/client";
import {
  CaseAction,
  CaseNotificationWebhookRequest,
  CaseStatus,
  DocumentVerificationWebhookRequest,
  IdentityDocumentURLResponse,
  SardineDeviceInformationResponse,
  SardineRiskLevels,
} from "../integrations/SardineTypeDefinitions";
import {
  FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE,
  FAKE_DOCUMENT_VERIFICATION_DOCUMENT_RECAPTURE_NEEDED_RESPONSE,
} from "../integrations/fakes/FakeSardineResponses";
// eslint-disable-next-line unused-imports/no-unused-imports
import { Readable } from "stream";
import { DocumentInformation } from "../domain/DocumentInformation";
import { DocumentTypes } from "../domain/DocumentTypes";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { getMockNotificationServiceWithDefaults } from "../../../modules/notifications/mocks/mock.notification.service";
import { NotificationEventType } from "../../../modules/notifications/domain/NotificationTypes";
import { IDVerificationURLRequestLocale } from "../dto/IDVerificationRequestURLDTO";
import { TransactionVerification } from "../domain/TransactionVerification";
import { ServiceException } from "../../../core/exception/service.exception";
import { v4 } from "uuid";
import * as alertUtils from "../../../core/alerts/alert.dto";

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

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2020, 3, 1));
  });

  describe("getDeviceVerificationResult", () => {
    it("should return device information", async () => {
      const sessionKey = v4();
      const deviceInfo: SardineDeviceInformationResponse = {
        id: v4(),
        level: SardineRiskLevels.LOW,
        sessionKey: sessionKey,
      };

      when(idvProvider.getDeviceVerificationResult(sessionKey)).thenResolve(deviceInfo);
      const result = await verificationService.getDeviceVerificationResult(sessionKey);
      expect(result).toEqual(deviceInfo);
    });
  });

  describe("createSession", () => {
    it("should return session information", async () => {
      when(verificationRepo.saveVerificationData(anything())).thenResolve(
        VerificationData.createVerificationData({
          id: "test-session",
        }),
      );

      const result = await verificationService.createSession();
      expect(result.props.id).toBe("test-session");
    });
  });

  describe("verifyConsumerInformation", () => {
    it("should verify ConsumerInformation when idvProvider returns APPROVED for US user", async () => {
      const consumer = getFakeConsumer();
      const consumerInformation = getFakeConsumerInformation(consumer);
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
        createdTimestamp: new Date(),
      };

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );

      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp
      when(
        idvProvider.postConsumerFeedback(sessionKey, consumer.props.id, deepEqual(consumerVerificationResult)),
      ).thenResolve();

      const result = await verificationService.verifyConsumerInformation(consumer.props.id, sessionKey);
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

    it.skip("should verify ConsumerInformation when idvProvider returns APPROVED for non-US user", async () => {
      const consumer = getFakeConsumer("fake-consumer-id", "IN");
      const consumerInformation = getFakeConsumerInformation(consumer);
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

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );

      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp
      when(
        idvProvider.postConsumerFeedback(sessionKey, consumer.props.id, deepEqual(consumerVerificationResult)),
      ).thenResolve();

      const result = await verificationService.verifyConsumerInformation(consumer.props.id, sessionKey);
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
      const consumerInformation = getFakeConsumerInformation(consumer);

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
      };

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );

      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp
      when(
        idvProvider.postConsumerFeedback(sessionKey, consumer.props.id, deepEqual(consumerVerificationResult)),
      ).thenResolve();

      const result = await verificationService.verifyConsumerInformation(consumer.props.id, sessionKey);
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
      const consumerInformation = getFakeConsumerInformation(consumer);

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
      };

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.verifyConsumerInformation(sessionKey, deepEqual(consumerInformation))).thenResolve(
        consumerVerificationResult,
      );

      when(consumerService.updateConsumer(anything())).thenResolve(Consumer.createConsumer(newConsumerData)); //we cannot predict input accurately as there is timestamp
      const result = await verificationService.verifyConsumerInformation(consumer.props.id, sessionKey);
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
          documentVerificationTimestamp: new Date(),
        },
      };

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
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
      const rejectedStatuses = [
        DocumentVerificationStatus.REJECTED,
        DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE,
        DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY,
        DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE,
      ];
      rejectedStatuses.forEach(async rejectedStatus => {
        const consumer = getFakeConsumer(`first-name-${rejectedStatus}`);
        const verificationId = "fake-id";

        const documentVerificationResult: DocumentVerificationResult = {
          status: rejectedStatus as DocumentVerificationStatus,
          riskRating: "fake-rating",
        };

        const newConsumerProps: ConsumerProps = {
          ...consumer.props,
          verificationData: {
            ...consumer.props.verificationData,
            documentVerificationStatus: rejectedStatus as DocumentVerificationStatus,
            documentVerificationTimestamp: new Date(),
          },
        };

        when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
        when(idvProvider.getDocumentVerificationResult(verificationId)).thenResolve(documentVerificationResult);
        when(consumerService.updateConsumer(deepEqual(newConsumerProps))).thenResolve(
          Consumer.createConsumer(newConsumerProps),
        );

        const result = await verificationService.getDocumentVerificationResult(consumer.props.id, verificationId);
        expect(result.status).toEqual(rejectedStatus);
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
          documentVerificationTimestamp: new Date(),
        },
      };

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
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
          documentVerificationTimestamp: new Date(),
        },
      };

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
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

    it("should raise an alert if the consumer cannot be found", async () => {
      when(consumerService.getConsumer(anyString())).thenResolve(null);

      const alertLogSpy = jest.spyOn(alertUtils, "formatAlertLog");

      const result = await verificationService.processDocumentVerificationWebhookResult({
        data: {
          case: {
            customerID: "12345",
          },
        },
      } as any); // Only need customer id to trigger the error

      expect(alertLogSpy).toHaveBeenCalledWith(expect.objectContaining({ key: "WEBHOOK_CONSUMER_NOT_FOUND" }));
      expect(result).toBeNull();
    });
  });
  describe("transactionVerification", () => {
    it("verify transaction parameters and return ACCEPTED if Sardine doesn't flag the transaction", async () => {
      const consumer = getFakeConsumer();
      const transactionInformation = getFakeTransactionVerification();
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
        id: sessionKey,
        transactionID: transactionInformation.transactionRef,
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

    it("throw a ServiceException if the IDV call results in a BadRequestException", async () => {
      const consumer = getFakeConsumer();
      const transactionInformation = getFakeTransactionVerification();
      const sessionKey = "fake-session-key";

      when(
        idvProvider.transactionVerification(sessionKey, deepEqual(consumer), deepEqual(transactionInformation)),
      ).thenThrow(new BadRequestException("Error-message"));

      expect(
        async () => await verificationService.transactionVerification(sessionKey, consumer, transactionInformation),
      ).rejects.toThrow(ServiceException);
    });

    it("throw a ServiceException if the IDV call results an empty result", async () => {
      const consumer = getFakeConsumer();
      const transactionInformation = getFakeTransactionVerification();
      const sessionKey = "fake-session-key";

      when(
        idvProvider.transactionVerification(sessionKey, deepEqual(consumer), deepEqual(transactionInformation)),
      ).thenResolve(null);

      expect(
        async () => await verificationService.transactionVerification(sessionKey, consumer, transactionInformation),
      ).rejects.toThrow(ServiceException);
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
      const args = capture(consumerService.updateConsumer);
      expect(args.last()[0].verificationData.kycCheckStatus).toBe(KYCStatus.APPROVED);

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

    it.skip("sets user verification status as APPROVED when case status is RESOLVED and action is APPROVED for non-US consumer", async () => {
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

      const args = capture(consumerService.updateConsumer);
      expect(args.last()[0].verificationData.kycCheckStatus).toBe(KYCStatus.APPROVED);

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

      const args = capture(consumerService.updateConsumer);
      expect(args.last()[0].verificationData.kycCheckStatus).toBe(KYCStatus.REJECTED);
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

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
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
            email: consumer.props.displayEmail,
          }),
        ),
      ).once();

      expect(updateUserArgs.verificationData.documentVerificationStatus).toBe(DocumentVerificationStatus.PENDING);
      expect(updateUserArgs.verificationData.documentCheckReference).toBe(verificationId);
    });

    it("should send a notification and throw an exception if document verification fails", async () => {
      const consumer = getFakeConsumer();
      const sessionKey = "fake-session-key";
      const documentInformation = getFakeDocumentInformation(consumer);

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(idvProvider.verifyDocument(sessionKey, deepEqual(documentInformation), deepEqual(consumer))).thenThrow(
        new Error(),
      );

      when(notificationService.sendNotification(anything(), anything())).thenResolve();
      await expect(
        async () => await verificationService.verifyDocument(consumer.props.id, sessionKey, documentInformation),
      ).rejects.toThrow(Error);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_DOCUMENT_VERIFICATION_TECHNICAL_FAILURE_EVENT,
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
});

function getFakeConsumer(firstName = "Fake", countryCode = "US"): Consumer {
  const consumerID = v4();
  return Consumer.createConsumer({
    id: consumerID,
    firstName: firstName,
    lastName: "Consumer",
    email: "fake+consumer@noba.com",
    phone: "+447700900000",
    displayEmail: "fake+consumer@noba.com",
    address: {
      streetLine1: "Test street",
      countryCode: countryCode,
      city: "Fake City",
      regionCode: "RC",
      postalCode: "123456",
    },
    dateOfBirth: "1990-03-30",
    verificationData: {
      provider: KYCProvider.SARDINE,
      kycCheckStatus: KYCStatus.NOT_SUBMITTED,
      documentVerificationStatus: DocumentVerificationStatus.REQUIRED,
      documentVerificationTimestamp: new Date(),
      kycVerificationTimestamp: new Date(),
      isSuspectedFraud: false,
      consumerID: consumerID,
    },
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
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

function getFakeConsumerInformation(consumer: Consumer): ConsumerInformation {
  const consumerInfo: ConsumerInformation = {
    userID: consumer.props.id,
    firstName: consumer.props.firstName,
    lastName: consumer.props.lastName,
    address: consumer.props.address,
    dateOfBirth: consumer.props.dateOfBirth,
    phoneNumber: consumer.props.phone,
    email: consumer.props.email,
    createdTimestampMillis: consumer.props.createdTimestamp.getTime(),
  };

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

function getFakeTransactionVerification(): TransactionVerification {
  return {
    transactionRef: "fake-transaction-id",
    debitConsumerID: "debit-consumer-id",
    creditConsumerID: "credit-consumer-id",
    debitAmount: 100,
    debitCurrency: "USD",
    creditAmount: 100,
    creditCurrency: "USD",
    workflowName: "fake-workflow",
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
