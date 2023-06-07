import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { ConsumerInformation, KYCFlow } from "../domain/ConsumerInformation";
import { Sardine } from "../integrations/sardine.client";
import { v4 } from "uuid";
import mockAxios from "jest-mock-axios";
import {
  FAKE_422_VALIDATION_ERROR,
  FAKE_DEVICE_INFORMATION_RESPONSE,
  FAKE_DOCUMENT_SUBMISSION_RESPONSE,
  FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE,
  FAKE_DOCUMENT_VERIFICATION_DOCUMENT_RECAPTURE_NEEDED_RESPONSE,
  FAKE_DOCUMENT_VERIFICATION_FRAUDULENT_DOCUMENT_RESPONSE,
  FAKE_GOOD_TRANSACTION,
  FAKE_KYC_CASE_NOTIFICATION_APPROVED,
  FAKE_KYC_CASE_NOTIFICATION_IN_PROGRESS_STATE,
  FAKE_KYC_CASE_NOTIFICATION_REJECTED,
  KYC_SSN_HIGH_RISK,
  KYC_SSN_LOW_RISK,
  KYC_SSN_VERY_HIGH_RISK,
} from "../integrations/fakes/FakeSardineResponses";
import { Consumer } from "../../consumer/domain/Consumer";
import { BadRequestException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { DocumentInformation } from "../domain/DocumentInformation";
import { DocumentTypes } from "../domain/DocumentTypes";
import { Readable } from "stream";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { NationalIDTypes } from "../domain/NationalIDTypes";
import {
  CustomerType,
  DocumentVerificationErrorCodes,
  SardineCustomerRequest,
  SardineDocumentProcessingStatus,
  SardineRiskLevels,
} from "../integrations/SardineTypeDefinitions";
import { instance, when } from "ts-mockito";
import { IDVerificationURLRequestLocale } from "../dto/IDVerificationRequestURLDTO";
import {
  DocumentVerificationStatus,
  KYCStatus,
  WalletStatus,
  KYCProvider,
  PaymentMethodType,
  PaymentProvider,
  PaymentMethodStatus,
} from "@prisma/client";
import { ConsumerService } from "../../consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../consumer/mocks/mock.consumer.service";
import { PaymentMethod } from "../../consumer/domain/PaymentMethod";
import { TransactionVerification } from "../domain/TransactionVerification";
import { WorkflowName } from "../../transaction/domain/Transaction";
import { getMockCircleServiceWithDefaults } from "../../circle/public/mocks/mock.circle.service";
import { HealthCheckStatus } from "../../../core/domain/HealthCheckTypes";
import { CircleService } from "../../../modules/circle/public/circle.service";
import { AlertService } from "../../../modules/common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../modules/common/mocks/mock.alert.service";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

//TODO: Add assertions for request body
describe("SardineTests", () => {
  let consumerService: ConsumerService;
  let circleService: CircleService;
  jest.setTimeout(10000);
  let sardine: Sardine;
  let mockAlertService: AlertService;

  beforeEach(async () => {
    consumerService = getMockConsumerServiceWithDefaults();
    circleService = getMockCircleServiceWithDefaults();
    mockAlertService = getMockAlertServiceWithDefaults();
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
      providers: [
        Sardine,
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: CircleService,
          useFactory: () => instance(circleService),
        },
        {
          provide: AlertService,
          useFactory: () => instance(mockAlertService),
        },
      ],
    }).compile();

    sardine = app.get<Sardine>(Sardine);
  });

  afterEach(() => {
    mockAxios.reset();
  });

  describe("getHealth", () => {
    it("Should return status of OK", async () => {
      const responsePromise = sardine.getHealth();
      expect(mockAxios.get).toHaveBeenCalled();
      mockAxios.mockResponse({ data: { status: "OK" } });
      const response = await responsePromise;
      expect(response.status).toEqual(HealthCheckStatus.OK);
    });

    it("Should return status UNAVAILABLE", async () => {
      const responsePromise = sardine.getHealth();
      expect(mockAxios.get).toHaveBeenCalled();
      mockAxios.mockError(new Error("Test error"));
      const response = await responsePromise;
      expect(response.status).toEqual(HealthCheckStatus.UNAVAILABLE);
    });
  });

  describe("verifyConsumerInformation", () => {
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

      const responsePromise = sardine.verifyConsumerInformation(KYC_SSN_LOW_RISK.data.sessionKey, consumerInformation, [
        KYCFlow.CUSTOMER,
      ]);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockResponse(KYC_SSN_LOW_RISK);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.APPROVED);
      expect(response.idvProviderRiskLevel).toBe("low");
    });

    it("Should return status APPROVED if risk level is 'low' when SSN and phoneNumber is passed", async () => {
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
        phoneNumber: "+1 234 567 8900", // Spaces to be replaced in code
        nationalID: {
          type: NationalIDTypes.SOCIAL_SECURITY,
          number: "000000002",
        },
      };

      const sardineRequest: SardineCustomerRequest = {
        flow: "kyc-us",
        sessionKey: KYC_SSN_LOW_RISK.data.sessionKey,
        customer: {
          id: consumerInformation.userID,
          firstName: consumerInformation.firstName,
          lastName: consumerInformation.lastName,
          address: {
            street1: consumerInformation.address.streetLine1,
            street2: consumerInformation.address.streetLine2,
            city: consumerInformation.address.city,
            regionCode: consumerInformation.address.regionCode,
            postalCode: consumerInformation.address.postalCode,
            countryCode: consumerInformation.address.countryCode,
          },
          type: CustomerType.CUSTOMER,
          phone: "+12345678900",
          isPhoneVerified: false,
          emailAddress: consumerInformation.email,
          isEmailVerified: true,
          dateOfBirth: consumerInformation.dateOfBirth,
          taxId: consumerInformation.nationalID.number,
        },
        checkpoints: ["customer"],
      };

      const responsePromise = sardine.verifyConsumerInformation(KYC_SSN_LOW_RISK.data.sessionKey, consumerInformation, [
        KYCFlow.CUSTOMER,
      ]);
      expect(mockAxios.post).toHaveBeenCalledWith("http://localhost:8080/sardine/v1/customers", sardineRequest, {
        auth: { password: "test-secret-key", username: "test-client-id" },
      });
      mockAxios.mockResponse(KYC_SSN_LOW_RISK);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.APPROVED);
      expect(response.idvProviderRiskLevel).toBe("low");
    });

    it("Should return status APPROVED if risk level is 'low' when using login flow", async () => {
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
        phoneNumber: "+1 234 567 8900", // Spaces to be replaced in code
        nationalID: {
          type: NationalIDTypes.SOCIAL_SECURITY,
          number: "000000002",
        },
      };

      const sardineRequest: SardineCustomerRequest = {
        flow: "login",
        sessionKey: KYC_SSN_LOW_RISK.data.sessionKey,
        customer: {
          id: consumerInformation.userID,
          firstName: consumerInformation.firstName,
          lastName: consumerInformation.lastName,
          address: {
            street1: consumerInformation.address.streetLine1,
            street2: consumerInformation.address.streetLine2,
            city: consumerInformation.address.city,
            regionCode: consumerInformation.address.regionCode,
            postalCode: consumerInformation.address.postalCode,
            countryCode: consumerInformation.address.countryCode,
          },
          createdAtMillis: undefined,
          type: CustomerType.CUSTOMER,
          phone: "+12345678900",
          isPhoneVerified: false,
          emailAddress: consumerInformation.email,
          isEmailVerified: true,
          dateOfBirth: consumerInformation.dateOfBirth,
          taxId: consumerInformation.nationalID.number,
        },
        checkpoints: ["login"],
      };

      const responsePromise = sardine.verifyConsumerInformation(KYC_SSN_LOW_RISK.data.sessionKey, consumerInformation, [
        KYCFlow.LOGIN,
      ]);
      expect(mockAxios.post).toHaveBeenCalledWith("http://localhost:8080/sardine/v1/customers", sardineRequest, {
        auth: { password: "test-secret-key", username: "test-client-id" },
      });
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

      const responsePromise = sardine.verifyConsumerInformation(
        KYC_SSN_HIGH_RISK.data.sessionKey,
        consumerInformation,
        [KYCFlow.CUSTOMER],
      );
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
        [KYCFlow.CUSTOMER],
      );
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockResponse(KYC_SSN_VERY_HIGH_RISK);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.REJECTED);
      expect(response.idvProviderRiskLevel).toBe("very_high");
    });

    it("Should execute the international flow for an international user", async () => {
      const consumerInformation: ConsumerInformation = {
        userID: "test-user-1234",
        firstName: "Test",
        lastName: "User",
        address: {
          streetLine1: "Test street",
          streetLine2: "Test street line 2",
          countryCode: "IN",
          city: "CA",
          regionCode: "RC",
          postalCode: "123456",
        },
        dateOfBirth: "1860-03-03",
        email: "test+user@noba.com",
        phoneNumber: "+123456789",
        nationalID: {
          type: NationalIDTypes.SOCIAL_SECURITY,
          number: "000000002",
        },
      };

      const sardineRequest: SardineCustomerRequest = {
        flow: "kyc-non-us",
        sessionKey: KYC_SSN_LOW_RISK.data.sessionKey,
        customer: {
          id: consumerInformation.userID,
          firstName: consumerInformation.firstName,
          lastName: consumerInformation.lastName,
          address: {
            street1: consumerInformation.address.streetLine1,
            street2: consumerInformation.address.streetLine2,
            city: consumerInformation.address.city,
            regionCode: consumerInformation.address.regionCode,
            postalCode: consumerInformation.address.postalCode,
            countryCode: consumerInformation.address.countryCode,
          },
          type: CustomerType.CUSTOMER,
          phone: consumerInformation.phoneNumber,
          isPhoneVerified: false,
          emailAddress: consumerInformation.email,
          isEmailVerified: true,
          dateOfBirth: consumerInformation.dateOfBirth,
          taxId: consumerInformation.nationalID.number,
        },
        checkpoints: ["customer"],
      };

      const responsePromise = sardine.verifyConsumerInformation(KYC_SSN_LOW_RISK.data.sessionKey, consumerInformation, [
        KYCFlow.CUSTOMER,
      ]);
      expect(mockAxios.post).toHaveBeenCalledWith("http://localhost:8080/sardine/v1/customers", sardineRequest, {
        auth: { password: "test-secret-key", username: "test-client-id" },
      });
      mockAxios.mockResponse(KYC_SSN_LOW_RISK);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.APPROVED);
      expect(response.idvProviderRiskLevel).toBe("low");
    });

    it("Should throw a BadRequestException if Sardine returns a 422 error", async () => {
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

      const responsePromise = sardine.verifyConsumerInformation(KYC_SSN_LOW_RISK.data.sessionKey, consumerInformation, [
        KYCFlow.CUSTOMER,
      ]);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        response: {
          status: 422,
          data: FAKE_422_VALIDATION_ERROR,
        },
      });

      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(JSON.parse(e.message)).toEqual(FAKE_422_VALIDATION_ERROR);
      }
    });

    it("should thow BadRequestException when Sardine api call fails", async () => {
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
        [KYCFlow.CUSTOMER],
      );
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        message: "Failed",
      });

      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe("Failed");
      }
    });
  });

  describe("transactionVerification", () => {
    it("[OTHER] Should return status APPROVED when transaction is low risk (other) - WALLET_DEPOSIT", async () => {
      const consumer = getFakeConsumer();
      const transactionVerification: TransactionVerification = {
        transactionRef: "transaction-1",
        debitConsumerID: consumer.props.id,
        creditConsumerID: null,
        debitAmount: 45000,
        debitCurrency: "COP",
        creditAmount: 100,
        creditCurrency: "USD",
        workflowName: WorkflowName.WALLET_DEPOSIT,
      };

      when(circleService.getOrCreateWallet(consumer.props.id)).thenResolve("wallet-1");

      const responsePromise = sardine.transactionVerification(
        FAKE_GOOD_TRANSACTION.data.sessionKey,
        consumer,
        transactionVerification,
      );
      await sleep(500);
      expect(mockAxios.post).toHaveBeenCalled();

      mockAxios.mockResponse(FAKE_GOOD_TRANSACTION);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.APPROVED);
      expect(response.idvProviderRiskLevel).toBe("low");
      expect(response.pepLevel).toBeFalsy();
      expect(response.sanctionLevel).toBeFalsy();
    });

    it("[OTHER] Should return status APPROVED when transaction is low risk (other) - WALLET_WITHDRAWAL", async () => {
      const consumer = getFakeConsumer();
      const transactionVerification: TransactionVerification = {
        transactionRef: "transaction-1",
        debitConsumerID: consumer.props.id,
        creditConsumerID: null,
        debitAmount: 100,
        debitCurrency: "USD",
        creditAmount: 45000,
        creditCurrency: "COP",
        workflowName: WorkflowName.WALLET_WITHDRAWAL,
        withdrawalDetails: {
          accountNumber: "12345",
          accountType: "checking",
          bankCode: "882883833",
          documentType: "unkonwn",
          documentNumber: "999999",
          country: "CO",
        },
      };

      when(circleService.getOrCreateWallet(consumer.props.id)).thenResolve("wallet-1");

      const responsePromise = sardine.transactionVerification(
        FAKE_GOOD_TRANSACTION.data.sessionKey,
        consumer,
        transactionVerification,
      );
      await sleep(500);
      expect(mockAxios.post).toHaveBeenCalled();

      mockAxios.mockResponse(FAKE_GOOD_TRANSACTION);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.APPROVED);
      expect(response.idvProviderRiskLevel).toBe("low");
      expect(response.pepLevel).toBeFalsy();
      expect(response.sanctionLevel).toBeFalsy();
    });

    it("[OTHER] Should return status APPROVED when transaction is low risk (other) - WALLET_TRANSFER", async () => {
      const consumer1 = getFakeConsumer();
      const consumer2 = getFakeConsumer();
      const transactionVerification: TransactionVerification = {
        transactionRef: "transaction-1",
        debitConsumerID: consumer1.props.id,
        creditConsumerID: consumer2.props.id,
        debitAmount: 100,
        debitCurrency: "USD",
        creditAmount: 100,
        creditCurrency: "USD",
        workflowName: WorkflowName.WALLET_TRANSFER,
      };

      when(consumerService.getConsumer(consumer2.props.id)).thenResolve(consumer2);

      when(circleService.getOrCreateWallet(consumer1.props.id)).thenResolve("wallet-1");
      when(circleService.getOrCreateWallet(consumer2.props.id)).thenResolve("wallet-2");

      const responsePromise = sardine.transactionVerification(
        FAKE_GOOD_TRANSACTION.data.sessionKey,
        consumer1,
        transactionVerification,
      );
      await sleep(500);
      expect(mockAxios.post).toHaveBeenCalled();

      mockAxios.mockResponse(FAKE_GOOD_TRANSACTION);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.APPROVED);
      expect(response.idvProviderRiskLevel).toBe("low");
      expect(response.pepLevel).toBeFalsy();
      expect(response.sanctionLevel).toBeFalsy();
    });

    it("[OTHER] Should throw an error if the workflow name is unknown", async () => {
      const consumerID1 = "consumer-1";
      const consumerID2 = "consumer-2";
      const transactionVerification: TransactionVerification = {
        transactionRef: "transaction-1",
        debitConsumerID: consumerID1,
        creditConsumerID: consumerID2,
        debitAmount: 100,
        debitCurrency: "USD",
        creditAmount: 100,
        creditCurrency: "USD",
        workflowName: "Unknown" as WorkflowName,
      };

      const consumer = Consumer.createConsumer({
        id: consumerID1,
        email: "fake+consumer@noba.com",
        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          provider: KYCProvider.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationTimestamp: new Date(),
          documentVerificationTimestamp: new Date(),
          isSuspectedFraud: false,
        },
      });

      when(circleService.getOrCreateWallet("consumer-1")).thenResolve("wallet-1");

      expect(async () => {
        await sardine.transactionVerification(FAKE_GOOD_TRANSACTION.data.sessionKey, consumer, transactionVerification);
      }).rejects.toThrow(Error);
    });

    it("Should throw BadRequestException when axios call fails", async () => {
      const consumer = getFakeConsumer();
      const transactionVerification: TransactionVerification = {
        transactionRef: "transaction-1",
        debitConsumerID: null,
        creditConsumerID: consumer.props.id,
        debitAmount: 45000,
        debitCurrency: "COP",
        creditAmount: 100,
        creditCurrency: "USD",
        workflowName: WorkflowName.WALLET_DEPOSIT,
      };

      when(circleService.getOrCreateWallet(consumer.props.id)).thenResolve("wallet-1");
      const responsePromise = sardine.transactionVerification(
        FAKE_GOOD_TRANSACTION.data.sessionKey,
        consumer,
        transactionVerification,
      );
      await sleep(500);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        message: "Network Error",
      });

      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe("Network Error");
      }
    });

    it("Should throw BadRequestException if Sardine returns a 422 error", async () => {
      const consumer = getFakeConsumer();
      const transactionVerification: TransactionVerification = {
        transactionRef: "transaction-1",
        debitConsumerID: null,
        creditConsumerID: consumer.props.id,
        debitAmount: 45000,
        debitCurrency: "COP",
        creditAmount: 100,
        creditCurrency: "USD",
        workflowName: WorkflowName.WALLET_DEPOSIT,
      };

      when(circleService.getOrCreateWallet(consumer.props.id)).thenResolve("wallet-1");
      const responsePromise = sardine.transactionVerification(
        FAKE_GOOD_TRANSACTION.data.sessionKey,
        consumer,
        transactionVerification,
      );
      await sleep(500);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        response: {
          status: 422,
          data: FAKE_422_VALIDATION_ERROR,
        },
      });

      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(JSON.parse(e.message)).toEqual(FAKE_422_VALIDATION_ERROR);
      }
    });
  });

  describe("getIdentityDocumentVerificationURL", () => {
    it("should return a URL to the identity provider", async () => {
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

      const responsePromise = sardine.getIdentityDocumentVerificationURL(
        "session-key",
        consumer,
        IDVerificationURLRequestLocale.EN_US,
        true,
        true,
        true,
      );

      expect(mockAxios.post).toHaveBeenCalled();

      const url = "http://url-to-nowhere";
      const response = {
        id: "id",
        link: {
          expiredAt: "1234567890",
          url: url,
        },
      };

      mockAxios.mockResponse({
        data: response,
      });

      const result = await responsePromise;
      expect(result).toBe(response);
    });

    it("should throw an Internal Server Error", async () => {
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

      mockAxios.post.mockRejectedValueOnce(new Error("Network Error"));

      const responsePromise = sardine.getIdentityDocumentVerificationURL(
        "session-key",
        consumer,
        IDVerificationURLRequestLocale.EN_US,
        true,
        true,
        true,
      );

      expect(mockAxios.post).toHaveBeenCalled();

      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it("should throw an a BadRequestException if Sardine returns a 422 error", async () => {
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

      mockAxios.post.mockRejectedValueOnce({
        response: {
          status: 422,
          data: FAKE_422_VALIDATION_ERROR,
        },
      });

      const responsePromise = sardine.getIdentityDocumentVerificationURL(
        "session-key",
        consumer,
        IDVerificationURLRequestLocale.EN_US,
        true,
        true,
        true,
      );

      expect(mockAxios.post).toHaveBeenCalled();

      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(JSON.parse(e.message)).toEqual(FAKE_422_VALIDATION_ERROR);
      }
    });
  });

  describe("getDocumentVerificationResult", () => {
    it("should return status APPROVED for valid documents", async () => {
      const responsePromise = sardine.getDocumentVerificationResult("fake-verification-id");

      expect(mockAxios.get).toHaveBeenCalled();

      mockAxios.mockResponse({
        data: FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE,
      });

      const result = await responsePromise;
      expect(result.status).toBe(DocumentVerificationStatus.APPROVED);
    });

    it("should throw BadRequestException if Sardine returns a 422 error", async () => {
      mockAxios.get.mockRejectedValueOnce({
        response: {
          status: 422,
          data: FAKE_422_VALIDATION_ERROR,
        },
      });
      const responsePromise = sardine.getDocumentVerificationResult("fake-verification-id");

      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(JSON.parse(e.message)).toEqual(FAKE_422_VALIDATION_ERROR);
      }
    });

    it("should throw error if axios calls fail", async () => {
      mockAxios.get.mockRejectedValueOnce(new Error("Network Error"));
      const responsePromise = sardine.getDocumentVerificationResult("fake-verification-id");

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
    it("should submit document front image successfully and return verification id", async () => {
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
        id: "fake-consumer-1234",
        email: "fake+consumer@noba.com",
        firstName: "Fake",
        lastName: "Consumer",

        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          provider: KYCProvider.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationTimestamp: new Date(),
          documentVerificationTimestamp: new Date(),
          isSuspectedFraud: false,
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

    it("should submit all documents successfully and return verification id", async () => {
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
        documentBackImage: fileData,
        photoImage: fileData,
      };

      const sessionKey = "fake-session";

      const consumer = Consumer.createConsumer({
        id: "fake-consumer-1234",
        email: "fake+consumer@noba.com",
        firstName: "Fake",
        lastName: "Consumer",

        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          provider: KYCProvider.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationTimestamp: new Date(),
          documentVerificationTimestamp: new Date(),
          isSuspectedFraud: false,
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
        id: "fake-consumer-1234",
        email: "fake+consumer@noba.com",
        firstName: "Fake",
        lastName: "Consumer",

        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          provider: KYCProvider.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationTimestamp: new Date(),
          documentVerificationTimestamp: new Date(),
          isSuspectedFraud: false,
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

    it("should throw BadRequestException if Sardine returns a 422 response", async () => {
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
        id: "fake-consumer-1234",
        email: "fake+consumer@noba.com",
        firstName: "Fake",
        lastName: "Consumer",

        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          provider: KYCProvider.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationTimestamp: new Date(),
          documentVerificationTimestamp: new Date(),
          isSuspectedFraud: false,
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
          status: 422,
          data: FAKE_422_VALIDATION_ERROR,
        },
      });

      try {
        await promise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(JSON.parse(e.message)).toEqual(FAKE_422_VALIDATION_ERROR);
      }
    });

    it("should throw BadRequestException if status code is not 400 or 422", async () => {
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
        id: "fake-consumer-1234",
        email: "fake+consumer@noba.com",
        firstName: "Fake",
        lastName: "Consumer",

        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          provider: KYCProvider.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationTimestamp: new Date(),
          documentVerificationTimestamp: new Date(),
          isSuspectedFraud: false,
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
        message: "Unauthorized",
        response: {
          status: 401,
        },
      });

      try {
        await promise;
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe("getDeviceVerificationResult", () => {
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

    it("should throw BadRequestException if Sardine returns a 422 error", async () => {
      const sessionKey = "fake-session-key";
      const responsePromise = sardine.getDeviceVerificationResult(sessionKey);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        response: {
          status: 422,
          data: FAKE_422_VALIDATION_ERROR,
        },
      });

      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(JSON.parse(e.message)).toEqual(FAKE_422_VALIDATION_ERROR);
      }
    });

    it("should throw NotFoundException if session key is not found by Sardine", async () => {
      const sessionKey = "fake-session-key";
      const responsePromise = sardine.getDeviceVerificationResult(sessionKey);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        response: {
          data: {
            message: "Session key does not exist",
          },
        },
      });
      try {
        await responsePromise;
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe("processDocumentVerificationResult", () => {
    it("should return status APPROVED when document verification response specifies low risk", async () => {
      const response = sardine.processDocumentVerificationResult(FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE);
      expect(response.status).toBe(DocumentVerificationStatus.APPROVED);
      expect(response.riskRating).toBe("low");
    });

    it("should return status REJECTED when uploaded document is not proper and recapture is needed", async () => {
      const response = sardine.processDocumentVerificationResult(
        FAKE_DOCUMENT_VERIFICATION_DOCUMENT_RECAPTURE_NEEDED_RESPONSE,
      );
      expect(response.status).toBe(DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE);
      expect(response.riskRating).toBe("high");
    });

    it("should return status PENDING when uploaded document is identified as high risk", async () => {
      const response = sardine.processDocumentVerificationResult(
        FAKE_DOCUMENT_VERIFICATION_FRAUDULENT_DOCUMENT_RESPONSE,
      );
      expect(response.status).toBe(DocumentVerificationStatus.PENDING);
      expect(response.riskRating).toBe("high");
    });

    it("should return status PENDING when uploaded document status is PENDING", async () => {
      const documentVerificationResponse = FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE;
      documentVerificationResponse.status = SardineDocumentProcessingStatus.PENDING;
      const response = sardine.processDocumentVerificationResult(documentVerificationResponse);
      expect(response.status).toBe(DocumentVerificationStatus.PENDING);
    });

    it("should return status PENDING when uploaded document status is PROCESSING", async () => {
      const documentVerificationResponse = FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE;
      documentVerificationResponse.status = SardineDocumentProcessingStatus.PROCESSING;
      const response = sardine.processDocumentVerificationResult(documentVerificationResponse);
      expect(response.status).toBe(DocumentVerificationStatus.PENDING);
    });

    it("should return status PENDING and risk level UNKNOWN when uploaded document status is COMPLETE but risk level is UNKNOWN", async () => {
      const documentVerificationResponse = FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE;
      documentVerificationResponse.status = SardineDocumentProcessingStatus.COMPLETE;
      documentVerificationResponse.verification.riskLevel = SardineRiskLevels.UNKNOWN;
      const response = sardine.processDocumentVerificationResult(documentVerificationResponse);
      expect(response.status).toBe(DocumentVerificationStatus.PENDING);
      expect(response.riskRating).toBe(SardineRiskLevels.UNKNOWN);
    });

    it("should return status APPROVED and risk level MEDIUM when uploaded document status is COMPLETE and risk level is MEDIUM", async () => {
      const documentVerificationResponse = FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE;
      documentVerificationResponse.status = SardineDocumentProcessingStatus.COMPLETE;
      documentVerificationResponse.verification.riskLevel = SardineRiskLevels.MEDIUM;
      const response = sardine.processDocumentVerificationResult(documentVerificationResponse);
      expect(response.status).toBe(DocumentVerificationStatus.APPROVED);
      expect(response.riskRating).toBe(SardineRiskLevels.MEDIUM);
    });

    it("should throw InternalServerErrorException when status is COMPLETE and riskLevel is not proper", async () => {
      const documentVerificationResponse = FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE;
      documentVerificationResponse.status = SardineDocumentProcessingStatus.COMPLETE;
      documentVerificationResponse.verification.riskLevel = "fake" as any;
      try {
        sardine.processDocumentVerificationResult(documentVerificationResponse);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it("should return status REJECTED_DOCUMENT_POOR_QUALITY document status is DOCUMENT_UNRECOGNIZABLE", async () => {
      const documentVerificationResponse = FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE;
      documentVerificationResponse.status = SardineDocumentProcessingStatus.ERROR;
      documentVerificationResponse.verification.riskLevel = SardineRiskLevels.HIGH;
      documentVerificationResponse.errorCodes = [DocumentVerificationErrorCodes.DOCUMENT_UNRECOGNIZABLE];
      const response = sardine.processDocumentVerificationResult(documentVerificationResponse);
      expect(response.status).toBe(DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY);
      expect(response.riskRating).toBe(SardineRiskLevels.HIGH);
    });

    it("should return status REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE document status is DOCUMENT_BAD_SIZE_OR_TYPE", async () => {
      const documentVerificationResponse = FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE;
      documentVerificationResponse.status = SardineDocumentProcessingStatus.ERROR;
      documentVerificationResponse.verification.riskLevel = SardineRiskLevels.HIGH;
      documentVerificationResponse.errorCodes = [DocumentVerificationErrorCodes.DOCUMENT_BAD_SIZE_OR_TYPE];
      const response = sardine.processDocumentVerificationResult(documentVerificationResponse);
      expect(response.status).toBe(DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE);
      expect(response.riskRating).toBe(SardineRiskLevels.HIGH);
    });

    it("should throw InternalServerErrorException when status is REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE and error code is not proper", async () => {
      const documentVerificationResponse = FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE;
      documentVerificationResponse.status = SardineDocumentProcessingStatus.ERROR;
      documentVerificationResponse.verification.riskLevel = SardineRiskLevels.HIGH;
      documentVerificationResponse.errorCodes = ["fake" as any];
      try {
        sardine.processDocumentVerificationResult(documentVerificationResponse);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it("should throw InternalServerErrorException when status is REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE and error code does not exist", async () => {
      const documentVerificationResponse = FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE;
      documentVerificationResponse.status = SardineDocumentProcessingStatus.ERROR;
      documentVerificationResponse.verification.riskLevel = SardineRiskLevels.HIGH;
      documentVerificationResponse.errorCodes = [];
      try {
        sardine.processDocumentVerificationResult(documentVerificationResponse);
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
      }
    });

    it("should return status REJECTED when document verification result is REJECTED", () => {
      const documentVerificationResponse = FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE;
      documentVerificationResponse.status = SardineDocumentProcessingStatus.REJECTED;
      documentVerificationResponse.verification.riskLevel = SardineRiskLevels.HIGH;

      const response = sardine.processDocumentVerificationResult(documentVerificationResponse);
      expect(response.status).toBe(DocumentVerificationStatus.REJECTED);
      expect(response.riskRating).toBe(SardineRiskLevels.HIGH);
    });

    it("should return status PENDING when document verification status is not one of COMPLETE, ERROR, REJECTED, PENDING, PROCESSING", () => {
      const documentVerificationResponse = FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE;
      documentVerificationResponse.status = "fakeStatus" as any;
      documentVerificationResponse.verification.riskLevel = SardineRiskLevels.HIGH;

      const response = sardine.processDocumentVerificationResult(documentVerificationResponse);
      expect(response.status).toBe(DocumentVerificationStatus.PENDING);
      expect(response.riskRating).toBe(SardineRiskLevels.HIGH);
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
    it("should call feedback API successfully", async () => {
      const consumerVerificationResult: ConsumerVerificationResult = {
        status: KYCStatus.APPROVED,
      };

      const consumer = getFakeConsumer();
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

      sardine.postConsumerFeedback("fake-session", consumer.props.id, consumerVerificationResult.status);
      await sleep(500);
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it("should throw log a more detailed error if Sardine returns a 422 response code", async () => {
      const consumerVerificationResult: ConsumerVerificationResult = {
        status: KYCStatus.APPROVED,
      };

      const consumer = getFakeConsumer();
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

      const responsePromise = sardine.postConsumerFeedback(
        "fake-session",
        consumer.props.id,
        consumerVerificationResult.status,
      );
      await sleep(500);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        response: {
          status: 422,
          data: FAKE_422_VALIDATION_ERROR,
        },
      });

      await responsePromise;
      expect(true).toBe(true);
    });

    it("should not throw error if feedback API fails with a non-422 response code", async () => {
      const consumerVerificationResult: ConsumerVerificationResult = {
        status: KYCStatus.APPROVED,
      };

      const consumer = getFakeConsumer();
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);

      const responsePromise = sardine.postConsumerFeedback(
        "fake-session",
        consumer.props.id,
        consumerVerificationResult.status,
      );
      await sleep(500);
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
    it("should call feedback API successfully", async () => {
      const documentVerificationResult: DocumentVerificationResult = {
        status: DocumentVerificationStatus.APPROVED,
      };

      sardine.postDocumentFeedback("fake-session", documentVerificationResult);
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it("should throw log a more detailed error if Sardine returns a 422 response code", async () => {
      const documentVerificationResult: DocumentVerificationResult = {
        status: DocumentVerificationStatus.APPROVED,
      };

      const responsePromise = sardine.postDocumentFeedback("fake-session", documentVerificationResult);
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        response: {
          status: 422,
          data: FAKE_422_VALIDATION_ERROR,
        },
      });

      await responsePromise;
      expect(true).toBe(true);
    });

    it("should not throw error if feedback API fails with a non-422 response code", async () => {
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
    it("should call feedback API successfully", async () => {
      sardine.postTransactionFeedback("fake-session", "fake-error", "Fake Error", "fake-transaction", "checkout");
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it("should not throw error if feedback API fails with a 422 response code", async () => {
      const responsePromise = sardine.postTransactionFeedback(
        "fake-session",
        "fake-error",
        "Fake Error",
        "fake-transaction",
        "checkout",
      );
      expect(mockAxios.post).toHaveBeenCalled();
      mockAxios.mockError({
        response: {
          status: 422,
          data: FAKE_422_VALIDATION_ERROR,
        },
      });
      await responsePromise;
      expect(true).toBe(true);
    });

    it("should not throw error if feedback API fails with a non-422 response code", async () => {
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

const getFakeConsumer = (): Consumer => {
  const consumer = Consumer.createConsumer({
    id: v4(),
    createdTimestamp: new Date(),
    email: "fake+consumer@noba.com",
    firstName: "fake",
    lastName: "consumer",
    phone: "+571234123412",
    dateOfBirth: "1990-01-01",
    address: {
      countryCode: "CO",
    },
    verificationData: {
      kycCheckStatus: KYCStatus.APPROVED,
      provider: KYCProvider.SARDINE,
      documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
      kycVerificationTimestamp: new Date(),
      documentVerificationTimestamp: new Date(),
      isSuspectedFraud: false,
    },
  });
  return consumer;
};
