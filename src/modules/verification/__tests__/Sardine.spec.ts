import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { ConsumerInformation } from "../domain/ConsumerInformation";
import { Sardine } from "../integrations/Sardine";
import mockAxios from "jest-mock-axios";
import {
  FAKE_DEVICE_INFORMATION_RESPONSE,
  FAKE_DOCUMENT_SUBMISSION_RESPONSE,
  FAKE_DOCUMENT_VERIFICATION_APPROVED_RESPONSE,
  FAKE_DOCUMENT_VERIFICATION_DOCUMENT_RECAPTURE_NEEDED_RESPONSE,
  FAKE_DOCUMENT_VERIFICATION_FRAUDULENT_DOCUMENT_RESPONSE,
  FAKE_FRAUDULENT_TRANSACTION,
  FAKE_GOOD_TRANSACTION,
  FAKE_HIGH_RISK_TRANSACTION,
  FAKE_KYC_CASE_NOTIFICATION_APPROVED,
  FAKE_KYC_CASE_NOTIFICATION_IN_PROGRESS_STATE,
  FAKE_KYC_CASE_NOTIFICATION_REJECTED,
  KYC_SSN_HIGH_RISK,
  KYC_SSN_LOW_RISK,
  KYC_SSN_VERY_HIGH_RISK,
} from "../integrations/fakes/FakeSardineResponses";
import { TransactionInformation } from "../domain/TransactionInformation";
import { Consumer } from "../../consumer/domain/Consumer";
import { BadRequestException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { DocumentInformation } from "../domain/DocumentInformation";
import { DocumentTypes } from "../domain/DocumentTypes";
import { Readable } from "stream";
import { ConsumerVerificationResult, DocumentVerificationResult } from "../domain/VerificationResult";
import { NationalIDTypes } from "../domain/NationalIDTypes";
import {
  DocumentVerificationErrorCodes,
  PaymentMethodTypes,
  SardineCustomerRequest,
  SardineDocumentProcessingStatus,
  SardineRiskLevels,
} from "../integrations/SardineTypeDefinitions";
import { anything, instance, when } from "ts-mockito";
import { BankAccountType } from "../../psp/domain/PlaidTypes";
import { PlaidClient } from "../../psp/plaid.client";
import { getMockPlaidClientWithDefaults } from "../../psp/mocks/mock.plaid.client";
import { IDVerificationURLRequestLocale } from "../dto/IDVerificationRequestURLDTO";
import {
  DocumentVerificationStatus,
  KYCStatus,
  WalletStatus,
  KYCProvider,
  PaymentMethodType,
  PaymentProvider,
} from "@prisma/client";
import { ConsumerService } from "../../../modules/consumer/consumer.service";
import { getMockConsumerServiceWithDefaults } from "../../../modules/consumer/mocks/mock.consumer.service";
import { PaymentMethod } from "../../../modules/consumer/domain/PaymentMethod";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

//TODO: Add assertions for request body
describe("SardineTests", () => {
  let plaidClient: PlaidClient;
  let consumerService: ConsumerService;
  jest.setTimeout(10000);
  let sardine: Sardine;

  beforeEach(async () => {
    plaidClient = getMockPlaidClientWithDefaults();
    consumerService = getMockConsumerServiceWithDefaults();
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
        {
          provide: PlaidClient,
          useFactory: () => instance(plaidClient),
        },
        Sardine,
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
      ],
    }).compile();

    sardine = app.get<Sardine>(Sardine);
  });

  afterEach(() => {
    mockAxios.reset();
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

      const responsePromise = sardine.verifyConsumerInformation(KYC_SSN_LOW_RISK.data.sessionKey, consumerInformation);
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
          phone: "+12345678900",
          isPhoneVerified: false,
          emailAddress: consumerInformation.email,
          isEmailVerified: true,
          dateOfBirth: consumerInformation.dateOfBirth,
          taxId: consumerInformation.nationalID.number,
        },
        checkpoints: ["customer"],
      };

      const responsePromise = sardine.verifyConsumerInformation(KYC_SSN_LOW_RISK.data.sessionKey, consumerInformation);
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
          phone: consumerInformation.phoneNumber,
          isPhoneVerified: false,
          emailAddress: consumerInformation.email,
          isEmailVerified: true,
          dateOfBirth: consumerInformation.dateOfBirth,
          taxId: consumerInformation.nationalID.number,
        },
        checkpoints: ["customer"],
      };

      const responsePromise = sardine.verifyConsumerInformation(KYC_SSN_LOW_RISK.data.sessionKey, consumerInformation);
      expect(mockAxios.post).toHaveBeenCalledWith("http://localhost:8080/sardine/v1/customers", sardineRequest, {
        auth: { password: "test-secret-key", username: "test-client-id" },
      });
      mockAxios.mockResponse(KYC_SSN_LOW_RISK);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.APPROVED);
      expect(response.idvProviderRiskLevel).toBe("low");
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
    it("[CARD] Should return status APPROVED when transaction is low risk (card)", async () => {
      const transactionInformation: TransactionInformation = {
        transactionID: "transaction-1",
        amount: 100,
        currencyCode: "USD",
        paymentMethodID: "card-1234",
        cryptoCurrencyCode: "ETH",
        walletAddress: "good+wallet",
      };

      const consumer = Consumer.createConsumer({
        id: "fake-consumer-1234",
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

      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([
        PaymentMethod.createPaymentMethod({
          id: "card-1234",
          imageUri: "image-uri",
          type: PaymentMethodType.CARD,
          paymentProvider: PaymentProvider.CHECKOUT,
          paymentToken: transactionInformation.paymentMethodID,
          isDefault: false,
          cardData: {
            first6Digits: "123456",
            last4Digits: "7890",
            id: "card-type-1234",
            scheme: "VISA",
            cardType: "DEBIT",
            authCode: "100001",
            authReason: "Approved",
            paymentMethodID: "card-1234",
          },
        }),
      ]);

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
      expect(response.pepLevel).toBeFalsy();
      expect(response.sanctionLevel).toBeFalsy();
      expect(response.walletStatus).toBe(WalletStatus.APPROVED);
    });

    it("[BANK] Should return status APPROVED when transaction is low risk (ACH)", async () => {
      const plaidAccessToken = "plaid-access-token-for-public-token";
      const plaidAuthGetItemID = "plaid-itemID-for-auth-get-request";
      const plaidAccountID = "plaid-account-id-for-the-consumer-bank-account";
      const plaidCheckoutProcessorToken = "processor-token-for-plaid-checkout-integration";

      const consumerAccountNumber = "1111111111";
      const achRoutingNumber = "9999999999";
      const wireRoutingNumber = "2222222222";

      const transactionInformation: TransactionInformation = {
        transactionID: "transaction-1",
        amount: 100,
        currencyCode: "USD",
        paymentMethodID: plaidCheckoutProcessorToken,
        cryptoCurrencyCode: "ETH",
        walletAddress: "good+wallet",
      };

      const consumer = Consumer.createConsumer({
        id: "fake-consumer-1234",
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

      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([
        PaymentMethod.createPaymentMethod({
          id: plaidCheckoutProcessorToken,
          imageUri: "image-uri",
          type: PaymentMethodType.ACH,
          name: "Bank Account",
          paymentProvider: PaymentProvider.CHECKOUT,
          paymentToken: plaidCheckoutProcessorToken,
          isDefault: false,
          achData: {
            id: "fake-ach-id",
            paymentMethodID: "fake-id",
            accessToken: plaidAccessToken,
            accountID: plaidAccountID,
            itemID: plaidAuthGetItemID,
            mask: "7890",
            accountType: BankAccountType.CHECKING,
          },
        }),
      ]);

      jest.spyOn(global.Date, "now").mockImplementation(() => 555555555);
      const expectedSanctionsCheckSardineRequest: SardineCustomerRequest = {
        flow: "payment-submission",
        sessionKey: "aml-123",
        customer: {
          id: consumer.props.id,
        },
        transaction: {
          id: "transaction-1",
          status: "accepted",
          createdAtMillis: 555555555,
          amount: 100,
          currencyCode: "USD",
          actionType: "buy",
          paymentMethod: {
            type: PaymentMethodTypes.BANK,
            bank: {
              accountNumber: consumerAccountNumber,
              routingNumber: achRoutingNumber,
              accountType: "checking",
              balance: 100.23,
              balanceCurrencyCode: "INR",
              id: "inst-id",
              idSource: "plaid",
            },
          },
          recipient: {
            emailAddress: "fake+consumer@noba.com",
            isKycVerified: true,
            paymentMethod: {
              type: PaymentMethodTypes.CRYPTO,
              crypto: {
                currencyCode: transactionInformation.cryptoCurrencyCode,
                address: transactionInformation.walletAddress,
              },
            },
          },
        },
        checkpoints: ["aml", "payment"],
      };

      when(plaidClient.retrieveAccountData(anything())).thenResolve({
        accountID: plaidAccountID,
        accountNumber: consumerAccountNumber,
        accountType: BankAccountType.CHECKING,
        achRoutingNumber: achRoutingNumber,
        wireRoutingNumber: wireRoutingNumber,
        availableBalance: "100.23",
        currencyCode: "INR",
        itemID: plaidAuthGetItemID,
        mask: "7890",
        name: "account-name",
        institutionID: "inst-id",
      });

      // ******************* SETUP EXCEPT AXIOS ENDS  *******************
      //
      // *********************** REQUEST STARTS *************************

      const responsePromise = sardine.transactionVerification(
        FAKE_GOOD_TRANSACTION.data.sessionKey,
        consumer,
        transactionInformation,
      );
      // This sleep helps the flow to reach the 'axios.post()' call.
      //
      // Until https://github.com/knee-cola/jest-mock-axios/issues/46 is resolved,
      // this is the only way I found.
      await sleep(500);

      mockAxios.mockResponse(FAKE_GOOD_TRANSACTION);
      const response = await responsePromise;
      expect(mockAxios.post).toHaveBeenCalledWith(
        "http://localhost:8080/sardine/v1/customers",
        expectedSanctionsCheckSardineRequest,
        { auth: { password: "test-secret-key", username: "test-client-id" } },
      );

      expect(response.status).toBe(KYCStatus.APPROVED);
      expect(response.idvProviderRiskLevel).toBe("low");
      expect(response.pepLevel).toBeFalsy();
      expect(response.sanctionLevel).toBeFalsy();
      expect(response.walletStatus).toBe(WalletStatus.APPROVED);
    });

    it("Should return status PENDING when transaction is high risk", async () => {
      const transactionInformation: TransactionInformation = {
        transactionID: "transaction-1",
        amount: 100,
        currencyCode: "USD",
        paymentMethodID: "card-1234",
        cryptoCurrencyCode: "ETH",
        walletAddress: "risk+wallet",
      };

      const consumer = Consumer.createConsumer({
        id: "fake-consumer-1234",
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

      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([
        PaymentMethod.createPaymentMethod({
          id: "card-1234",
          imageUri: "image-uri",
          type: PaymentMethodType.CARD,
          paymentProvider: PaymentProvider.CHECKOUT,
          paymentToken: transactionInformation.paymentMethodID,
          isDefault: false,
          cardData: {
            first6Digits: "123456",
            last4Digits: "7890",
            id: "card-type-1234",
            scheme: "VISA",
            cardType: "DEBIT",
            authCode: "100001",
            authReason: "Approved",
            paymentMethodID: "card-1234",
          },
        }),
      ]);

      const responsePromise = sardine.transactionVerification(
        FAKE_GOOD_TRANSACTION.data.sessionKey,
        consumer,
        transactionInformation,
      );

      expect(mockAxios.post).toHaveBeenCalled();

      mockAxios.mockResponse(FAKE_HIGH_RISK_TRANSACTION);

      const response = await responsePromise;

      expect(response.status).toBe(KYCStatus.PENDING);
      expect(response.idvProviderRiskLevel).toBe("high");
      expect(response.pepLevel).toBeFalsy();
      expect(response.sanctionLevel).toBeFalsy();
      expect(response.walletStatus).toBe(WalletStatus.REJECTED);
    });

    it("should return status REJECTED with appropriate wallet status for fraudulent transaction", async () => {
      const transactionInformation: TransactionInformation = {
        transactionID: "transaction-1",
        amount: 100,
        currencyCode: "USD",
        paymentMethodID: "card-1234",
        cryptoCurrencyCode: "ETH",
        walletAddress: "good+wallet",
      };

      const consumer = Consumer.createConsumer({
        id: "fake-consumer-1234",
        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          provider: KYCProvider.SARDINE,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          kycVerificationTimestamp: new Date(),
          documentVerificationTimestamp: new Date(),
          isSuspectedFraud: false,
        },
      });

      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([
        PaymentMethod.createPaymentMethod({
          id: "card-1234",
          imageUri: "image-uri",
          type: PaymentMethodType.CARD,
          paymentProvider: PaymentProvider.CHECKOUT,
          paymentToken: transactionInformation.paymentMethodID,
          isDefault: false,
          cardData: {
            first6Digits: "123456",
            last4Digits: "7890",
            id: "card-type-1234",
            scheme: "VISA",
            cardType: "DEBIT",
            authCode: "100001",
            authReason: "Approved",
            paymentMethodID: "card-1234",
          },
        }),
      ]);

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
      expect(response.pepLevel).toBeFalsy();
      expect(response.sanctionLevel).toBeFalsy();
      expect(response.walletStatus).toBe(WalletStatus.REJECTED);
    });

    it("Should throw BadRequestException when axios call fails", async () => {
      const transactionInformation: TransactionInformation = {
        transactionID: "transaction-1",
        amount: 100,
        currencyCode: "USD",
        paymentMethodID: "card-1234",
        cryptoCurrencyCode: "ETH",
        walletAddress: "good+wallet",
      };

      const consumer = Consumer.createConsumer({
        id: "fake-consumer-1234",
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

      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([
        PaymentMethod.createPaymentMethod({
          id: "card-1234",
          imageUri: "image-uri",
          type: PaymentMethodType.CARD,
          paymentProvider: PaymentProvider.CHECKOUT,
          paymentToken: transactionInformation.paymentMethodID,
          isDefault: false,
          cardData: {
            first6Digits: "123456",
            last4Digits: "7890",
            id: "card-type-1234",
            scheme: "VISA",
            cardType: "DEBIT",
            authCode: "100001",
            authReason: "Approved",
            paymentMethodID: "card-1234",
          },
        }),
      ]);

      const responsePromise = sardine.transactionVerification(
        FAKE_GOOD_TRANSACTION.data.sessionKey,
        consumer,
        transactionInformation,
      );

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

    it("should throw BadRequestException if status code is not 400", async () => {
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
