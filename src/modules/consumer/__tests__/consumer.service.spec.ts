import { Test, TestingModule } from "@nestjs/testing";
import { getMockOtpRepoWithDefaults } from "../../../modules/auth/mocks/MockOtpRepo";
import { IOTPRepo } from "../../../modules/auth/repo/OTPRepo";
import { anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { CHECKOUT_CONFIG_KEY, CHECKOUT_PUBLIC_KEY, CHECKOUT_SECRET_KEY } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { PaymentService } from "../../psp/payment.service";
import { SanctionedCryptoWalletService } from "../../../modules/common/sanctionedcryptowallet.service";
import { KmsService } from "../../../modules/common/kms.service";
import { ConsumerService } from "../consumer.service";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { getMockConsumerRepoWithDefaults } from "../mocks/mock.consumer.repo";
import { IConsumerRepo } from "../repos/ConsumerRepo";
import { Result } from "../../../core/logic/Result";
import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { AddPaymentMethodDTO, PaymentType } from "../dto/AddPaymentMethodDTO";
import { CheckoutResponseData } from "../../../modules/common/domain/CheckoutResponseData";
import { PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";
import { AddPaymentMethodResponse } from "../../psp/domain/AddPaymentMethodResponse";
import { Transaction } from "../../../modules/transactions/domain/Transaction";
import { TransactionStatus } from "../../../modules/transactions/domain/Types";
import { FiatTransactionStatus, PaymentRequestResponse } from "../domain/Types";
import { PaymentMethod, PaymentMethodType } from "../domain/PaymentMethod";
import { Otp } from "../../../modules/auth/domain/Otp";
import { PartnerService } from "../../partner/partner.service";
import { getMockPartnerServiceWithDefaults } from "../../partner/mocks/mock.partner.service";
import { getMockSanctionedCryptoWalletServiceWithDefaults } from "../../common/mocks/mock.sanctionedcryptowallet.service";
import { Partner } from "../../partner/domain/Partner";
import { CryptoWallet } from "../domain/CryptoWallet";
import { getMockNotificationServiceWithDefaults } from "../../../modules/notifications/mocks/mock.notification.service";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { NotificationEventType } from "../../../modules/notifications/domain/NotificationTypes";
import { PaymentProvider } from "../domain/PaymentProvider";
import { PlaidClient } from "../../psp/plaid.client";
import { getMockPlaidClientWithDefaults } from "../../psp/mocks/mock.plaid.client";
import { BankAccountType } from "../../../modules/psp/domain/PlaidTypes";
import { SMSService } from "../../common/sms.service";
import { getMockSmsServiceWithDefaults } from "../../common/mocks/mock.sms.service";
import { UserPhoneUpdateRequest } from "../../../../test/api_client/models/UserPhoneUpdateRequest";
import { consumerIdentityIdentifier, IdentityType } from "../../auth/domain/IdentityType";
import { getMockPaymentServiceWithDefaults } from "../../../modules/psp/mocks/mock.payment.service";
import { Utils } from "../../../core/utils/Utils";
import { UserEmailUpdateRequest } from "../dto/EmailVerificationDTO";

describe("ConsumerService", () => {
  let consumerService: ConsumerService;
  let smsService: SMSService;
  let consumerRepo: IConsumerRepo;
  let notificationService: NotificationService;
  let mockOtpRepo: IOTPRepo;
  let paymentService: PaymentService;
  let sanctionedCryptoWalletService: SanctionedCryptoWalletService;
  let partnerService: PartnerService;
  let plaidClient: PlaidClient;

  jest.setTimeout(30000);

  beforeEach(async () => {
    consumerRepo = getMockConsumerRepoWithDefaults();
    notificationService = getMockNotificationServiceWithDefaults();
    mockOtpRepo = getMockOtpRepoWithDefaults();
    paymentService = getMockPaymentServiceWithDefaults();
    partnerService = getMockPartnerServiceWithDefaults();
    plaidClient = getMockPlaidClientWithDefaults();
    smsService = getMockSmsServiceWithDefaults();
    sanctionedCryptoWalletService = getMockSanctionedCryptoWalletServiceWithDefaults();

    const ConsumerRepoProvider = {
      provide: "ConsumerRepo",
      useFactory: () => instance(consumerRepo),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [
        TestConfigModule.registerAsync({
          [CHECKOUT_CONFIG_KEY]: {
            [CHECKOUT_PUBLIC_KEY]: "Dummy Checkout Public Key",
            [CHECKOUT_SECRET_KEY]: "Dummy Checkout Secret Key",
          },
        }),
        getTestWinstonModule(),
      ],
      controllers: [],
      providers: [
        ConsumerRepoProvider,
        ConsumerService,
        {
          provide: NotificationService,
          useFactory: () => instance(notificationService),
        },
        {
          provide: SMSService,
          useFactory: () => instance(smsService),
        },
        {
          provide: "OTPRepo",
          useFactory: () => instance(mockOtpRepo),
        },
        {
          provide: PaymentService,
          useFactory: () => instance(paymentService),
        },
        {
          provide: SanctionedCryptoWalletService,
          useFactory: () => instance(sanctionedCryptoWalletService),
        },
        {
          provide: PartnerService,
          useFactory: () => instance(partnerService),
        },
        {
          provide: PlaidClient,
          useFactory: () => instance(plaidClient),
        },
        KmsService,
      ],
    }).compile();

    consumerService = app.get<ConsumerService>(ConsumerService);
  });

  describe("createConsumerIfFirstTimeLogin", () => {
    it("should create user if not present", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        email: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      when(consumerRepo.getConsumerByEmail(email)).thenResolve(Result.fail("not found!"));
      when(consumerRepo.createConsumer(anything())).thenResolve(consumer);

      const response = await consumerService.getOrCreateConsumerConditionally(email, partnerId);
      expect(response).toStrictEqual(consumer);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_WELCOME_MESSAGE_EVENT,
          partnerId,
          deepEqual({
            email: email,
            firstName: undefined,
            lastName: undefined,
            nobaUserID: consumer.props._id,
          }),
        ),
      ).once();
    });

    it("should update partner details if consumer already exists and is added for new partner", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-2";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        email: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      const updatedConsumerData = Consumer.createConsumer({
        ...consumer.props,
        partners: [
          {
            partnerID: "partner-1",
          },
          {
            partnerID: partnerId,
          },
        ],
      });
      when(consumerRepo.getConsumerByEmail(email)).thenResolve(Result.ok(consumer));
      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumerData);
      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);

      const response = await consumerService.getOrCreateConsumerConditionally(email, partnerId);
      expect(response).toStrictEqual(updatedConsumerData);
    });

    it("should return consumer data if already exists and already is signed up with partner", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        email: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      when(consumerRepo.getConsumerByEmail(email)).thenResolve(Result.ok(consumer));

      const response = await consumerService.getOrCreateConsumerConditionally(email, partnerId);

      expect(response).toStrictEqual(consumer);
    });
  });

  describe("findConsumerById", () => {
    it("should find the consumer", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const consumerID = "mock-consumer-1";
      const consumer = Consumer.createConsumer({
        _id: consumerID,
        email: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      when(consumerRepo.getConsumer(consumerID)).thenResolve(consumer);
      const response = await consumerService.findConsumerById(consumerID);
      expect(response).toStrictEqual(consumer);
    });

    it("should not find the consumer if it doesn't exist", async () => {
      when(consumerRepo.getConsumer("missing-consumer")).thenThrow(new NotFoundException());

      expect(async () => {
        await consumerService.findConsumerById("missing-consumer");
      }).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateConsumer", () => {
    it("should update consumer details", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        email: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      const firstName = "First";
      const lastName = "Last";

      const updatedConsumerData = Consumer.createConsumer({
        ...consumer.props,
        firstName: firstName,
        lastName: lastName,
      });

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(deepEqual(updatedConsumerData))).thenResolve(updatedConsumerData);

      const response = await consumerService.updateConsumer({
        _id: consumer.props._id,
        firstName: firstName,
        lastName: lastName,
      });

      expect(response).toStrictEqual(updatedConsumerData);
    });

    it("should throw error if user does not exist", async () => {
      const consumerId = "fake-consumer-1";

      when(consumerRepo.getConsumer(consumerId)).thenReject(new NotFoundException("Not Found"));

      try {
        await consumerService.updateConsumer({
          _id: consumerId,
          firstName: "Fake",
        });
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe("addPaymentMethod", () => {
    it("adds a payment method of 'CARD' type", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      const addPaymentMethod: AddPaymentMethodDTO = {
        type: PaymentType.CARD,
        cardDetails: {
          cardNumber: "1234567890",
          expiryMonth: 8,
          expiryYear: 2023,
          cvv: "123",
        },
      } as any;

      const addPaymentMethodResponse: AddPaymentMethodResponse = constructAddPaymentMethodResponse(
        consumer,
        PaymentMethodStatus.APPROVED,
      );

      when(paymentService.addPaymentMethod(deepEqual(consumer), deepEqual(addPaymentMethod), partnerId)).thenResolve(
        addPaymentMethodResponse,
      );

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);

      when(
        consumerRepo.updateConsumer(deepEqual(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData))),
      ).thenResolve(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData));

      const response = await consumerService.addPaymentMethod(consumer, addPaymentMethod, partnerId);

      expect(response).toStrictEqual(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData));
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_CARD_ADDED_EVENT,
          partnerId,
          deepEqual({
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props._id,
            email: consumer.props.email,
            cardNetwork: addPaymentMethodResponse.newPaymentMethod.cardData.cardType,
            last4Digits: addPaymentMethodResponse.newPaymentMethod.cardData.last4Digits,
          }),
        ),
      ).once();
    });

    it("throws error when payment method is UNSUPPORTED", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      const addPaymentMethod: AddPaymentMethodDTO = {
        type: PaymentType.CARD,
        cardDetails: {
          cardNumber: "1234567890",
          expiryMonth: 8,
          expiryYear: 2023,
          cvv: "123",
        },
      } as any;

      const addPaymentMethodResponse: AddPaymentMethodResponse = constructAddPaymentMethodResponse(
        consumer,
        PaymentMethodStatus.UNSUPPORTED,
      );

      when(paymentService.addPaymentMethod(deepEqual(consumer), deepEqual(addPaymentMethod), partnerId)).thenResolve(
        addPaymentMethodResponse,
      );

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);

      when(consumerRepo.updateConsumer(anything())).thenResolve(
        Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData),
      );

      try {
        await consumerService.addPaymentMethod(consumer, addPaymentMethod, partnerId);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        verify(
          consumerRepo.updateConsumer(deepEqual(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData))),
        ).once();
      }
    });

    it("adds a payment method of 'ACH' type", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";

      const checkoutCustomerID = "checkout-customer-for-mock-consumer";

      const plaidPublicToken = "public-token-by-plain-embed-ui";
      const plaidAccessToken = "plaid-access-token-for-public-token";
      const plaidAuthGetItemID = "plaid-itemID-for-auth-get-request";
      const plaidAccountID = "plaid-account-id-for-the-consumer-bank-account";
      const plaidCheckoutProcessorToken = "processor-token-for-plaid-checkout-integration";

      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: checkoutCustomerID,
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      const addPaymentMethod: AddPaymentMethodDTO = {
        type: PaymentType.ACH,
        name: "Bank Account",
        achDetails: {
          token: plaidPublicToken,
        },
        imageUri: "https://noba.com",
      } as any;

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);

      const paymentMethod: PaymentMethod = {
        name: "Bank Account",
        type: PaymentMethodType.ACH,
        achData: {
          accessToken: plaidAccessToken,
          accountID: plaidAccountID,
          itemID: plaidAuthGetItemID,
          mask: "7890",
          accountType: BankAccountType.CHECKING,
        },
        paymentProviderID: PaymentProvider.CHECKOUT,
        paymentToken: plaidCheckoutProcessorToken,
        imageUri: "https://noba.com",
        status: PaymentMethodStatus.APPROVED,
      };

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [paymentMethod],
      });

      when(paymentService.addPaymentMethod(deepEqual(consumer), deepEqual(addPaymentMethod), partnerId)).thenResolve({
        checkoutResponseData: null,
        updatedConsumerData: updatedConsumer.props,
      });

      const expectedConsumerProps: ConsumerProps = {
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: checkoutCustomerID,
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            name: "Bank Account",
            type: PaymentMethodType.ACH,
            achData: {
              accessToken: plaidAccessToken,
              accountID: plaidAccountID,
              itemID: plaidAuthGetItemID,
              mask: "7890",
              accountType: BankAccountType.CHECKING,
            },
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: plaidCheckoutProcessorToken,
            imageUri: "https://noba.com",
            status: PaymentMethodStatus.APPROVED,
          },
        ],
        cryptoWallets: [],
      };

      when(consumerRepo.updateConsumer(deepEqual(Consumer.createConsumer(expectedConsumerProps)))).thenResolve(
        Consumer.createConsumer(expectedConsumerProps),
      );

      const response = await consumerService.addPaymentMethod(consumer, addPaymentMethod, partnerId);

      expect(response).toStrictEqual(Consumer.createConsumer(expectedConsumerProps));
    });
  });

  describe("requestPayment", () => {
    it("should make payment successfully", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const paymentToken = "fake-token";
      const paymentMethod = {
        type: PaymentMethodType.CARD,
        paymentProviderID: PaymentProvider.CHECKOUT,
        paymentToken: paymentToken,
        cardData: {
          first6Digits: "123456",
          last4Digits: "7890",
        },
        imageUri: "fake-uri",
      };
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [paymentMethod],
        cryptoWallets: [],
      });

      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props._id,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: paymentToken,
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        partnerID: partnerId,
        lastProcessingTimestamp: Date.now().valueOf(),
        lastStatusUpdateTimestamp: Date.now().valueOf(),
      });

      const paymentRequestResponse: PaymentRequestResponse = {
        status: PaymentMethodStatus.APPROVED,
        paymentID: "fake-payment-id",
      };

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(
        paymentService.requestCheckoutPayment(deepEqual(consumer), deepEqual(transaction), deepEqual(paymentMethod)),
      ).thenResolve(paymentRequestResponse);

      const response = await consumerService.requestPayment(consumer, transaction);
      expect(response).toStrictEqual(paymentRequestResponse);
    });

    it("should throw error when payment method is DELETED", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const paymentToken = "fake-token";
      const paymentMethod: PaymentMethod = {
        type: PaymentMethodType.CARD,
        paymentProviderID: PaymentProvider.CHECKOUT,
        paymentToken: paymentToken,
        cardData: {
          first6Digits: "123456",
          last4Digits: "7890",
        },
        imageUri: "fake-uri",
        status: PaymentMethodStatus.DELETED,
      };
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [paymentMethod],
        cryptoWallets: [],
      });

      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props._id,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: paymentToken,
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        partnerID: partnerId,
        lastProcessingTimestamp: Date.now().valueOf(),
        lastStatusUpdateTimestamp: Date.now().valueOf(),
      });

      expect(async () => await consumerService.requestPayment(consumer, transaction)).rejects.toThrow(
        BadRequestException,
      );

      expect(async () => await consumerService.requestPayment(consumer, transaction)).rejects.toThrow(
        "Payment method does not exist for user",
      );
    });

    it("should throw error when payment provider is not supported", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const paymentToken = "fake-token";
      const paymentProvider = "FakeProvider";
      const paymentMethod = {
        type: PaymentMethodType.CARD,
        paymentProviderID: paymentProvider as any,
        paymentToken: paymentToken,
        cardData: {
          first6Digits: "123456",
          last4Digits: "7890",
        },
        imageUri: "fake-uri",
      };
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [paymentMethod],
        cryptoWallets: [],
      });

      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props._id,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        fiatPaymentInfo: {
          paymentMethodID: paymentToken,
          isCompleted: false,
          isApproved: false,
          isFailed: false,
          details: [],
          paymentProvider: PaymentProvider.CHECKOUT,
        },
        leg1Amount: 1000,
        leg2Amount: 0.1,
        leg1: "USD",
        leg2: "ETH",
        partnerID: partnerId,
        lastProcessingTimestamp: Date.now().valueOf(),
        lastStatusUpdateTimestamp: Date.now().valueOf(),
      });

      const paymentRequestResponse: PaymentRequestResponse = {
        status: PaymentMethodStatus.APPROVED,
        paymentID: "fake-payment-id",
      };

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(
        paymentService.requestCheckoutPayment(deepEqual(consumer), deepEqual(transaction), deepEqual(paymentMethod)),
      ).thenResolve(paymentRequestResponse);

      try {
        await consumerService.requestPayment(consumer, transaction);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe(`Payment provider ${paymentProvider} is not supported`);
      }
    });
  });

  describe("removePaymentMethod", () => {
    it("should throw error when payment token does not exist for the consumer", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token-2",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
          },
        ],
        cryptoWallets: [],
      });

      expect(async () => await consumerService.removePaymentMethod(consumer, paymentToken, partnerId)).rejects.toThrow(
        NotFoundException,
      );

      expect(async () => await consumerService.removePaymentMethod(consumer, paymentToken, partnerId)).rejects.toThrow(
        "Payment Method id not found",
      );
    });

    it("should throw error when payment method is deleted for consumer", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            status: PaymentMethodStatus.DELETED,
          },
        ],
        cryptoWallets: [],
      });

      expect(async () => await consumerService.removePaymentMethod(consumer, paymentToken, partnerId)).rejects.toThrow(
        NotFoundException,
      );

      expect(async () => await consumerService.removePaymentMethod(consumer, paymentToken, partnerId)).rejects.toThrow(
        "Payment Method id not found",
      );
    });

    it("should delete payment method successfully", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
            status: PaymentMethodStatus.APPROVED,
          },
        ],
        cryptoWallets: [],
      });

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
            status: PaymentMethodStatus.DELETED,
          },
        ],
      });

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(paymentService.removePaymentMethod(paymentToken)).thenResolve();
      when(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).thenResolve(updatedConsumer);

      const response = await consumerService.removePaymentMethod(consumer, paymentToken, partnerId);
      expect(response).toStrictEqual(updatedConsumer);
      expect(response.props.paymentMethods.length).toBe(1);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_CARD_DELETED_EVENT,
          partnerId,
          deepEqual({
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props._id,
            email: consumer.props.email,
            cardNetwork: consumer.props.paymentMethods[0].cardData.cardType,
            last4Digits: consumer.props.paymentMethods[0].cardData.last4Digits,
          }),
        ),
      ).once();
    });
  });

  describe("getPaymentMethodProvider", () => {
    it("get payment provider for payment method", async () => {
      const paymentToken = "fake-payment-token";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "fake+email@noba.com",
        displayEmail: "fake+email@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: "fake-partner-1",
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [],
      });

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);

      const response = await consumerService.getPaymentMethodProvider(consumer.props._id, paymentToken);
      expect(response).toBe(PaymentProvider.CHECKOUT);
    });

    it("throws NotFoundException when paymentToken does not exist for consumer", async () => {
      const paymentToken = "fake-payment-token";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "fake+email@noba.com",
        displayEmail: "fake+email@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: "fake-partner-1",
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [],
      });

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);

      expect(
        async () => await consumerService.getPaymentMethodProvider(consumer.props._id, "new-fake-payment-token"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when payment method is deleted for consumer", async () => {
      const paymentToken = "fake-payment-token";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "fake+email@noba.com",
        displayEmail: "fake+email@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: "fake-partner-1",
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
            status: PaymentMethodStatus.DELETED,
          },
        ],
        cryptoWallets: [],
      });

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);

      expect(
        async () => await consumerService.getPaymentMethodProvider(consumer.props._id, paymentToken),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getFiatPaymentStatus", () => {
    it("returns fiat payment status successfully", async () => {
      const paymentToken = "fake-token";
      const paymentProvider = PaymentProvider.CHECKOUT;

      when(paymentService.getFiatPaymentStatus(paymentToken)).thenResolve(FiatTransactionStatus.AUTHORIZED);

      const response = await consumerService.getFiatPaymentStatus(paymentToken, paymentProvider);

      expect(response).toBe(FiatTransactionStatus.AUTHORIZED);
    });

    it("throws error when payment provider is not supported", async () => {
      const paymentToken = "fake-token";
      const paymentProvider = "FakeProvider";

      when(paymentService.getFiatPaymentStatus(paymentToken)).thenResolve(FiatTransactionStatus.AUTHORIZED);

      try {
        await consumerService.getFiatPaymentStatus(paymentToken, paymentProvider as PaymentProvider);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe("Payment provider is not supported");
      }
    });
  });

  describe("updatePaymentMethod", () => {
    it("should update payment method for consumer", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [],
      });

      const updatedPaymentMethod: PaymentMethod = {
        type: PaymentMethodType.CARD,
        paymentProviderID: PaymentProvider.CHECKOUT,
        paymentToken: paymentToken,
        cardData: {
          first6Digits: "123456",
          last4Digits: "7890",
          cardType: "VISA",
        },
        imageUri: "fake-uri",
        name: "New Fake Name",
      };

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [updatedPaymentMethod],
      });

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const response = await consumerService.updatePaymentMethod(consumer.props._id, updatedPaymentMethod);

      expect(response).toStrictEqual(updatedConsumer);
      verify(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).once();
    });

    it("should throw error when paymentToken does not exist for consumer", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [],
      });

      const updatedPaymentMethod: PaymentMethod = {
        type: PaymentMethodType.CARD,
        paymentProviderID: PaymentProvider.CHECKOUT,
        paymentToken: "new-token",
        cardData: {
          first6Digits: "123456",
          last4Digits: "7890",
          cardType: "VISA",
        },
        imageUri: "fake-uri",
        name: "New Fake Name",
      };

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      expect(
        async () => await consumerService.updatePaymentMethod(consumer.props._id, updatedPaymentMethod),
      ).rejects.toThrow(BadRequestException);
      expect(
        async () => await consumerService.updatePaymentMethod(consumer.props._id, updatedPaymentMethod),
      ).rejects.toThrow(`Payment method with token ${updatedPaymentMethod.paymentToken} does not exist for consumer`);
    });

    it("should throw error when payment method is deleted for consumer", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
            status: PaymentMethodStatus.DELETED,
          },
        ],
        cryptoWallets: [],
      });

      const updatedPaymentMethod: PaymentMethod = {
        type: PaymentMethodType.CARD,
        paymentProviderID: PaymentProvider.CHECKOUT,
        paymentToken: paymentToken,
        cardData: {
          first6Digits: "123456",
          last4Digits: "7890",
          cardType: "VISA",
        },
        imageUri: "fake-uri",
        name: "New Fake Name",
      };

      when(consumerRepo.updateConsumer(anything())).thenResolve(consumer);

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      expect(
        async () => await consumerService.updatePaymentMethod(consumer.props._id, updatedPaymentMethod),
      ).rejects.toThrow(BadRequestException);
      expect(
        async () => await consumerService.updatePaymentMethod(consumer.props._id, updatedPaymentMethod),
      ).rejects.toThrow(`Payment method with token ${updatedPaymentMethod.paymentToken} does not exist for consumer`);
    });
  });

  describe("confirmWalletUpdateOTP", () => {
    it("updates existing crypto wallet", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";
      const otp = 123456;
      const partnerId = "fake-partner";

      when(sanctionedCryptoWalletService.isWalletSanctioned(walletAddress)).thenResolve(false);

      const partner: Partner = Partner.createPartner({
        _id: partnerId,
        name: "partner name",
        config: {
          privateWallets: false,
        } as any,
      });
      when(partnerService.getPartner(partnerId)).thenResolve(partner);

      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.PENDING,
            partnerID: partnerId,
            isPrivate: false,
          },
        ],
      });

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.APPROVED,
            partnerID: partnerId,
            isPrivate: false,
          },
        ],
      });

      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 5);

      when(mockOtpRepo.getOTP(consumer.props.email, "CONSUMER", partnerId)).thenResolve(
        Otp.createOtp({
          _id: "fake-otp-id",
          emailOrPhone: consumer.props.email,
          otp: otp,
          otpExpiryTime: expiryDate.getTime(),
          identityType: "CONSUMER",
        }),
      );

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(mockOtpRepo.deleteOTP("fake-otp-id")).thenResolve();

      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const response = await consumerService.confirmWalletUpdateOTP(consumer, walletAddress, otp, partnerId);

      expect(response).toStrictEqual(updatedConsumer);

      verify(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).once();
    });

    it("throws BadRequestException when cryptoWallet is deleted", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";
      const otp = 123456;
      const partnerId = "fake-partner";

      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.DELETED,
            partnerID: partnerId,
            isPrivate: false,
          },
        ],
      });

      expect(
        async () => await consumerService.confirmWalletUpdateOTP(consumer, walletAddress, otp, partnerId),
      ).rejects.toThrow(BadRequestException);
      expect(
        async () => await consumerService.confirmWalletUpdateOTP(consumer, walletAddress, otp, partnerId),
      ).rejects.toThrow("Crypto wallet does not exist for user");
    });

    // it("throws an error for a sanctioned wallet", async () => {
    //   const email = "mock-user@noba.com";
    //   const walletAddress = "fake-wallet-address";
    //   const otp = 123456;

    //   when(sanctionedCryptoWalletService.isWalletSanctioned(walletAddress)).thenResolve(true);
    //   const consumer = Consumer.createConsumer({
    //     _id: "mock-consumer-1",
    //     firstName: "Fake",
    //     lastName: "Name",
    //     email: email,
    //     displayEmail: email,
    //     paymentProviderAccounts: [
    //       {
    //         providerCustomerID: "test-customer-1",
    //         providerID: PaymentProvider.CHECKOUT,
    //       },
    //     ],
    //     partners: [
    //       {
    //         partnerID: "partner-1",
    //       },
    //     ],
    //     isAdmin: false,
    //     paymentMethods: [
    //       {
    //         paymentProviderID: "Checkout",
    //         paymentToken: "fake-token",
    //         first6Digits: "123456",
    //         last4Digits: "7890",
    //         imageUri: "fake-uri",
    //         cardName: "Fake card",
    //         cardType: "VISA",
    //       },
    //     ],
    //     cryptoWallets: [
    //       {
    //         walletName: "Test wallet",
    //         address: walletAddress,
    //         status: WalletStatus.PENDING,
    //         isPrivate: false,
    //       },
    //     ],
    //   });

    //   const flaggedWallet: CryptoWallet = {
    //     walletName: "Test wallet",
    //     address: walletAddress,
    //     status: WalletStatus.FLAGGED,
    //     isPrivate: false,
    //   };
    //   const updatedConsumer = Consumer.createConsumer({
    //     ...consumer.props,
    //     cryptoWallets: [flaggedWallet],
    //   });

    //   const expiryDate = new Date();
    //   expiryDate.setMinutes(expiryDate.getMinutes() + 5);

    //   when(mockOtpRepo.getOTP(consumer.props.email, "CONSUMER")).thenResolve(
    //     Otp.createOtp({
    //       _id: "fake-otp-id",
    //       emailOrPhone: consumer.props.email,
    //       otp: otp,
    //       otpExpiryTime: expiryDate.getTime(),
    //       identityType: "CONSUMER",
    //     }),
    //   );

    //   when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
    //   when(mockOtpRepo.deleteOTP("fake-otp-id")).thenResolve();

    //   when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);
    //   //when();

    //   expect(async () => {
    //     await consumerService.confirmWalletUpdateOTP(consumer, walletAddress, otp);
    //   }).rejects.toThrow(BadRequestException);

    //   when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(updatedConsumer);

    //   expect(await consumerService.getConsumer(consumer.props._id)).toEqual(updatedConsumer);

    //   //expect()

    //   //expect(response).toStrictEqual(updatedConsumer);

    //   //expect(consumerService.addOrUpdateCryptoWallet).toBeCalledTimes(1);
    // });

    it("throws Unauthorized exception when otp is wrong", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";
      const otp = 123456;
      const wrongOtp = 234567;

      when(sanctionedCryptoWalletService.isWalletSanctioned(walletAddress)).thenResolve(false);
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.PENDING,
            isPrivate: false,
            partnerID: "partner-1",
          },
        ],
      });

      when(mockOtpRepo.getOTP(consumer.props.email, "CONSUMER", "partner-1")).thenResolve(
        Otp.createOtp({
          _id: "fake-otp-id",
          emailOrPhone: consumer.props.email,
          otp: otp,
          otpExpiryTime: new Date().getTime(),
          identityType: "CONSUMER",
        }),
      );

      try {
        await consumerService.confirmWalletUpdateOTP(consumer, walletAddress, wrongOtp, "partner-1");
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
      }
    });
  });

  describe("getCryptoWallet", () => {
    it("gets crypto wallet for consumer given address", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";

      when(sanctionedCryptoWalletService.isWalletSanctioned(walletAddress)).thenResolve(false);
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.PENDING,
            isPrivate: false,
            partnerID: "partner-1",
          },
        ],
      });

      const response = await consumerService.getCryptoWallet(consumer, walletAddress, "partner-1");
      expect(response).toStrictEqual(consumer.props.cryptoWallets[0]);
    });

    it("returns null when walletAddress does not exist for consumer", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";

      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.PENDING,
            isPrivate: false,
            partnerID: "partner-1",
          },
        ],
      });

      const response = await consumerService.getCryptoWallet(consumer, "new-wallet-address", "partner-1");
      expect(response).toStrictEqual(null);
    });

    it("returns null when wallet is deleted for consumer", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";

      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.DELETED,
            isPrivate: false,
            partnerID: "partner-1",
          },
        ],
      });

      const response = await consumerService.getCryptoWallet(consumer, walletAddress, "partner-1");
      expect(response).toStrictEqual(null);
    });
  });

  describe("removeCryptoWallet", () => {
    it("Sets wallet status to DELETED for user without touching other wallets", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";

      const partnerID = "partner-1";
      when(sanctionedCryptoWalletService.isWalletSanctioned(walletAddress)).thenResolve(false);
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerID,
          },
        ],
        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.PENDING,
            isPrivate: false,
            partnerID: partnerID,
          },
          {
            walletName: "Other wallet 1",
            address: walletAddress + "1",
            status: WalletStatus.PENDING,
            isPrivate: false,
            partnerID: partnerID,
          },
          {
            walletName: "Other wallet 2",
            address: walletAddress + "2",
            status: WalletStatus.PENDING,
            isPrivate: false,
            partnerID: "54321",
          },
        ],
      });

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        cryptoWallets: [
          {
            walletName: "Other wallet 1",
            address: walletAddress + "1",
            status: WalletStatus.PENDING,
            isPrivate: false,
            partnerID: partnerID,
          },
          {
            walletName: "Other wallet 2",
            address: walletAddress + "2",
            status: WalletStatus.PENDING,
            isPrivate: false,
            partnerID: "54321",
          },
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.DELETED,
            isPrivate: false,
            partnerID: partnerID,
          },
        ],
      });

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const response = await consumerService.removeCryptoWallet(consumer, walletAddress, "partner-1");

      expect(response).toStrictEqual(updatedConsumer);
      verify(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).once();
    });
  });

  describe("addZeroHashParticipantCode", () => {
    it("should add zeroHash participation code to user", async () => {
      const email = "fake+consumer@noba.com";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      const zhParticipantCode = "fake-zh-participation-code";

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anything())).thenResolve(
        Consumer.createConsumer({
          ...consumer.props,
          zhParticipantCode: zhParticipantCode,
        }),
      );

      const response = await consumerService.addZeroHashParticipantCode(consumer.props._id, zhParticipantCode);
      expect(response.props.zhParticipantCode).toBe(zhParticipantCode);
      verify(
        consumerRepo.updateConsumer(
          deepEqual(
            Consumer.createConsumer({
              ...consumer.props,
              zhParticipantCode: zhParticipantCode,
            }),
          ),
        ),
      ).once();
    });
  });

  describe("addOrUpdateCryptoWallet", () => {
    it("should add a second address if address exists for another partnerID", async () => {
      const partner1Id = "fake-partner-id-1";
      const partner2Id = "fake-partner-id-2";

      const cryptoWallet: CryptoWallet = {
        address: "fake-wallet-address",
        status: WalletStatus.APPROVED,
        partnerID: partner1Id,
        isPrivate: false,
      };
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "fake+email@noba.com",
        displayEmail: "fake+email@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partner1Id,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [cryptoWallet],
      });

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        cryptoWallets: [cryptoWallet, { ...cryptoWallet, partnerID: partner2Id }],
      });

      const partner: Partner = Partner.createPartner({
        _id: partner2Id,
        name: "Fake Partner",
        config: {
          privateWallets: false,
        } as any,
      });
      when(partnerService.getPartner(partner2Id)).thenResolve(partner);

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).thenResolve(updatedConsumer);
      const response = await consumerService.addOrUpdateCryptoWallet(consumer, {
        ...cryptoWallet,
        partnerID: partner2Id,
      });

      expect(response).toBe(updatedConsumer);
    });

    it("should set wallet status to PENDING when wallet status is DELETED and method is called", async () => {
      const partner1Id = "fake-partner-id-1";

      const cryptoWallet: CryptoWallet = {
        address: "fake-wallet-address",
        status: WalletStatus.DELETED,
        partnerID: partner1Id,
        isPrivate: false,
      };
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "fake+email@noba.com",
        displayEmail: "fake+email@noba.com",
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partner1Id,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [cryptoWallet],
      });

      const toAddCryptoWallet: CryptoWallet = {
        address: "fake-wallet-address",
        status: WalletStatus.PENDING,
        partnerID: partner1Id,
        isPrivate: false,
      };

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        cryptoWallets: [toAddCryptoWallet],
      });

      const partner: Partner = Partner.createPartner({
        _id: partner1Id,
        name: "Fake Partner",
        config: {
          privateWallets: false,
        } as any,
      });
      when(partnerService.getPartner(partner1Id)).thenResolve(partner);

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).thenResolve(updatedConsumer);
      const response = await consumerService.addOrUpdateCryptoWallet(consumer, toAddCryptoWallet);

      expect(response).toBe(updatedConsumer);
    });

    it("should override the 'isPrivate' field based on the 'partnerID'", async () => {
      const email = "fake.consumer@noba.com";
      const partnerId = "fake-partner-id";
      const consumerId = "mock_consumer_id";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        firstName: "Mock",
        lastName: "Consumer",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });
      when(consumerRepo.getConsumer(consumerId)).thenResolve(consumer);

      const partner: Partner = Partner.createPartner({
        _id: partnerId,
        name: "Fake Partner",
        config: {
          privateWallets: true,
        } as any,
      });
      when(partnerService.getPartner(partnerId)).thenResolve(partner);

      const newWallet: CryptoWallet = {
        address: "wallet-address",
        // "privateWallets" is set to "true" in the partner object.
        isPrivate: false,
        status: WalletStatus.APPROVED,
        partnerID: partnerId,
      };

      const updatedConsumer: Consumer = consumer;
      updatedConsumer.props.cryptoWallets.push({
        address: "wallet-address",
        status: WalletStatus.APPROVED,
        partnerID: partnerId,
        isPrivate: true,
      });
      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const returnedConsumer = await consumerService.addOrUpdateCryptoWallet(consumer, newWallet);

      expect(returnedConsumer).toEqual(updatedConsumer);
      const [updateConsumerCallParams] = capture(consumerRepo.updateConsumer).last();
      expect(updateConsumerCallParams.props.cryptoWallets).toHaveLength(1);
      expect(updateConsumerCallParams.props.cryptoWallets[0]).toEqual({
        address: "wallet-address",
        status: WalletStatus.APPROVED,
        partnerID: partnerId,
        isPrivate: true,
      });
    });

    it("should set 'isPrivate' to 'false' if 'privateWallet' config is missing in 'partner", async () => {
      const email = "fake.consumer@noba.com";
      const partnerId = "fake-partner-id";
      const consumerId = "mock_consumer_id";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        firstName: "Mock",
        lastName: "Consumer",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });
      when(consumerRepo.getConsumer(consumerId)).thenResolve(consumer);

      const partner: Partner = Partner.createPartner({
        _id: partnerId,
        name: "Fake Partner",
      });
      when(partnerService.getPartner(partnerId)).thenResolve(partner);

      const newWallet: CryptoWallet = {
        address: "wallet-address",
        // "privateWallets" is 'NOT' set in the partner object.
        isPrivate: false,
        status: WalletStatus.APPROVED,
        partnerID: partnerId,
      };

      const updatedConsumer: Consumer = consumer;
      updatedConsumer.props.cryptoWallets.push({
        address: "wallet-address",
        status: WalletStatus.APPROVED,
        partnerID: partnerId,
        isPrivate: true,
      });
      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const returnedConsumer = await consumerService.addOrUpdateCryptoWallet(consumer, newWallet);

      expect(returnedConsumer).toEqual(updatedConsumer);
      const [updateConsumerCallParams] = capture(consumerRepo.updateConsumer).last();
      expect(updateConsumerCallParams.props.cryptoWallets).toHaveLength(1);
      expect(updateConsumerCallParams.props.cryptoWallets[0]).toEqual({
        address: "wallet-address",
        status: WalletStatus.APPROVED,
        partnerID: partnerId,
        isPrivate: true,
      });
    });

    it("should append to CryptWallets list if the wallet is new", async () => {
      const email = "fake.consumer@noba.com";
      const partnerId = "fake-partner-id";
      const consumerId = "mock_consumer_id";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        firstName: "Mock",
        lastName: "Consumer",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [
          {
            address: "fake_existing_wallet_address",
            isPrivate: false,
            status: WalletStatus.APPROVED,
            partnerID: partnerId,
          },
        ],
      });
      when(consumerRepo.getConsumer(consumerId)).thenResolve(consumer);

      const partner: Partner = Partner.createPartner({
        _id: partnerId,
        name: "Fake Partner",
        config: {
          privateWallets: true,
        } as any,
      });
      when(partnerService.getPartner(partnerId)).thenResolve(partner);

      const newWallet: CryptoWallet = {
        address: "new-wallet-address",
        // "privateWallets" is set to "true" in the partner object.
        isPrivate: false,
        status: WalletStatus.PENDING,
        partnerID: partnerId,
      };

      const updatedConsumer: Consumer = consumer;
      updatedConsumer.props.cryptoWallets.push({
        address: "new-wallet-address",
        status: WalletStatus.PENDING,
        partnerID: partnerId,
        isPrivate: true,
      });
      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const returnedConsumer = await consumerService.addOrUpdateCryptoWallet(consumer, newWallet);

      expect(returnedConsumer).toEqual(updatedConsumer);
      const [updateConsumerCallParams] = capture(consumerRepo.updateConsumer).last();
      expect(updateConsumerCallParams.props.cryptoWallets).toContainEqual({
        address: "new-wallet-address",
        status: WalletStatus.PENDING,
        partnerID: partnerId,
        isPrivate: true,
      });
      expect(updateConsumerCallParams.props.cryptoWallets).toContainEqual(consumer.props.cryptoWallets[0]);
    });

    it("should update the 'status' field of CryptoWallet if it's already there", async () => {
      const email = "fake.consumer@noba.com";
      const partnerId = "fake-partner-id";
      const consumerId = "mock_consumer_id";

      const consumer = Consumer.createConsumer({
        _id: consumerId,
        firstName: "Mock",
        lastName: "Consumer",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [
          {
            address: "fake_existing_wallet_address",
            isPrivate: false,
            status: WalletStatus.PENDING,
            partnerID: partnerId,
          },
        ],
      });
      when(consumerRepo.getConsumer(consumerId)).thenResolve(consumer);

      const partner: Partner = Partner.createPartner({
        _id: partnerId,
        name: "Fake Partner",
        config: {
          privateWallets: false,
        } as any,
      });
      when(partnerService.getPartner(partnerId)).thenResolve(partner);

      const newWallet: CryptoWallet = {
        address: "fake_existing_wallet_address",
        isPrivate: false,
        status: WalletStatus.REJECTED,
        partnerID: partnerId,
      };

      const updatedConsumer: Consumer = consumer;
      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const returnedConsumer = await consumerService.addOrUpdateCryptoWallet(consumer, newWallet);

      expect(returnedConsumer).toEqual(updatedConsumer);
      const [updateConsumerCallParams] = capture(consumerRepo.updateConsumer).last();
      expect(updateConsumerCallParams.props.cryptoWallets).toHaveLength(1);
      expect(updateConsumerCallParams.props.cryptoWallets).toContainEqual({
        address: "fake_existing_wallet_address",
        status: WalletStatus.REJECTED,
        partnerID: partnerId,
        isPrivate: false,
      });
    });
  });

  describe("sendOtpToPhone", () => {
    it("should send otp to given phone number with given context", async () => {
      const phone = "+12434252";
      when(smsService.sendSMS(phone, anyString())).thenResolve();
      when(mockOtpRepo.saveOTPObject(anything())).thenResolve();
      when(mockOtpRepo.deleteAllOTPsForUser(phone, consumerIdentityIdentifier)).thenResolve();
      await consumerService.sendOtpToPhone(phone);
      verify(smsService.sendSMS(phone, anyString())).once();
      verify(mockOtpRepo.saveOTPObject(anything())).once();
    });
  });

  describe("updateConsumerPhone", () => {
    it("incorrect and correct otp", async () => {
      const phone = "+12434252";
      const email = "a@noba.com";
      const partnerId = "fake-partner-id2";
      const otp = 123456;
      const otpObject = Otp.createOtp({
        otp: otp,
        emailOrPhone: phone,
        identityType: IdentityType.consumer,
      });

      const consumer = Consumer.createConsumer({
        _id: "1234rwrwrwrwrwrwrwrw",
        firstName: "Mock",
        lastName: "Consumer",
        email: email,
        displayEmail: email,

        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
      });

      const phoneUpdateRequest: UserPhoneUpdateRequest = {
        phone: phone,
        otp: 123458, //incorrect otp
      };

      const expectedUpdatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        phone: phone,
      });

      when(mockOtpRepo.getOTP(phone, IdentityType.consumer)).thenResolve(otpObject);

      try {
        await consumerService.updateConsumerPhone(consumer, phoneUpdateRequest);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(BadRequestException);
      }

      phoneUpdateRequest.otp = otp; //correct otp

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anything())).thenResolve(expectedUpdatedConsumer);

      const updateConsumerResponse = await consumerService.updateConsumerPhone(consumer, phoneUpdateRequest);
      verify(consumerRepo.updateConsumer(anything())).once();
      const [requestArg] = capture(consumerRepo.updateConsumer).last();
      expect(requestArg.props.phone).toBe(phone);
      expect(updateConsumerResponse).toEqual(expectedUpdatedConsumer);
    });
  });

  describe("sendOtpToEmail", () => {
    it("should send otp to given email address with given context", async () => {
      const email = "Rosie@Noba.com";
      const partnerID = "Partner-123456789";
      const firstName = "Rosie";
      const otp = 654321;

      const consumer = Consumer.createConsumer({
        _id: "1234rwrwrwrwrwrwrwrw",
        firstName: firstName,
        lastName: "Consumer",
        partners: [
          {
            partnerID: partnerID,
          },
        ],
        isAdmin: false,
        phone: "+15559993333",
      });

      const addStub = jest.spyOn(Utils, "createOtp").mockReturnValueOnce(otp);
      when(
        notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, partnerID, {
          email: email,
          otp: otp.toString(),
          firstName: "Rosie",
        }),
      ).thenResolve();
      when(mockOtpRepo.saveOTPObject(anything())).thenResolve();
      when(mockOtpRepo.deleteAllOTPsForUser(email, consumerIdentityIdentifier)).thenResolve();
      await consumerService.sendOtpToEmail(email, consumer, partnerID);
      verify(mockOtpRepo.saveOTP(email, otp, consumerIdentityIdentifier)).once();
    });
  });

  describe("updateConsumerEmail", () => {
    it("incorrect and correct otp", async () => {
      const phone = "+12434252";
      const email = "Rosie@Noba.com";
      const partnerId = "fake-partner-id";
      const otp = 123456;
      const otpObject = Otp.createOtp({
        otp: otp,
        emailOrPhone: phone,
        identityType: IdentityType.consumer,
      });

      const consumer = Consumer.createConsumer({
        _id: "1234rwrwrwrwrwrwrwrw",
        firstName: "Mock",
        lastName: "Consumer",
        partners: [
          {
            partnerID: partnerId,
          },
        ],
        isAdmin: false,
        phone: phone,
      });

      const emailUpdateRequest: UserEmailUpdateRequest = {
        email: email,
        otp: 123458, //incorrect otp
      };

      when(mockOtpRepo.getOTP(email, IdentityType.consumer)).thenResolve(otpObject);

      try {
        await consumerService.updateConsumerEmail(consumer, emailUpdateRequest);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(BadRequestException);
      }

      emailUpdateRequest.otp = otp; //correct otp

      const expectedUpdatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        email: email.toLowerCase(),
        displayEmail: email,
      });

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anything())).thenResolve(expectedUpdatedConsumer);
      when(
        notificationService.sendNotification(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT, undefined, {
          email: email,
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
          nobaUserID: consumer.props.firstName,
        }),
      ).thenResolve();

      // update consumer
      const updateConsumerResponse = await consumerService.updateConsumerEmail(consumer, emailUpdateRequest);

      verify(consumerRepo.updateConsumer(anything())).once();
      const [requestArg] = capture(consumerRepo.updateConsumer).last();
      expect(requestArg.props.email).toBe(email.toLowerCase());
      expect(requestArg.props.displayEmail).toBe(email);
      expect(updateConsumerResponse).toEqual(expectedUpdatedConsumer);

      verify(notificationService.sendNotification(anything(), anything(), anything())).once();
      const [notificationType, notificationPartnerId, notificationUserArgs] = capture(
        notificationService.sendNotification,
      ).last();
      expect(notificationType).toBe(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT);
      expect(notificationPartnerId).toBe(undefined);
      expect(notificationUserArgs).toStrictEqual({
        email: email.toLowerCase(),
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props._id,
      });

      //update consumer again, this time notification shouldn't be sent
      await consumerService.updateConsumerEmail(updateConsumerResponse, emailUpdateRequest);
      verify(notificationService.sendNotification(anything(), anything(), anything())).once(); //already called above
    });
  });
});

function constructAddPaymentMethodResponse(
  consumer: Consumer,
  paymentMethodStatus: PaymentMethodStatus,
): AddPaymentMethodResponse {
  const updatedConsumer = Consumer.createConsumer({
    ...consumer.props,
    paymentMethods: [
      {
        type: PaymentMethodType.CARD,
        cardData: {
          first6Digits: "123456",
          last4Digits: "7890",
        },
        imageUri: "fake-uri",
        paymentToken: "fake-token",
        paymentProviderID: PaymentProvider.CHECKOUT,
      },
    ],
  });

  const checkoutResponseData: CheckoutResponseData = {
    paymentMethodStatus: paymentMethodStatus,
    responseCode: "fake-code",
    responseSummary: "fake-summary",
  };

  return {
    checkoutResponseData: checkoutResponseData,
    updatedConsumerData: updatedConsumer.props,
    newPaymentMethod: updatedConsumer.props.paymentMethods[0],
  };
}
