import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { UserPhoneUpdateRequest } from "../../../../test/api_client/models/UserPhoneUpdateRequest";
import { CHECKOUT_CONFIG_KEY, CHECKOUT_PUBLIC_KEY, CHECKOUT_SECRET_KEY } from "../../../config/ConfigurationUtils";
import { Result } from "../../../core/logic/Result";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { Utils } from "../../../core/utils/Utils";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { Otp } from "../../../modules/auth/domain/Otp";
import { getMockOtpRepoWithDefaults } from "../../../modules/auth/mocks/MockOtpRepo";
import { IOTPRepo } from "../../../modules/auth/repo/OTPRepo";
import { CheckoutResponseData } from "../../../modules/common/domain/CheckoutResponseData";
import { KmsService } from "../../../modules/common/kms.service";
import { SanctionedCryptoWalletService } from "../../../modules/common/sanctionedcryptowallet.service";
import { NotificationEventType } from "../../../modules/notifications/domain/NotificationTypes";
import { getMockNotificationServiceWithDefaults } from "../../../modules/notifications/mocks/mock.notification.service";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { BankAccountType } from "../../../modules/psp/domain/PlaidTypes";
import { getMockPaymentServiceWithDefaults } from "../../../modules/psp/mocks/mock.payment.service";
import { Transaction } from "../../../modules/transactions/domain/Transaction";
import { TransactionStatus } from "../../../modules/transactions/domain/Types";
import { consumerIdentityIdentifier, IdentityType } from "../../auth/domain/IdentityType";
import { getMockSanctionedCryptoWalletServiceWithDefaults } from "../../common/mocks/mock.sanctionedcryptowallet.service";
import { getMockSmsServiceWithDefaults } from "../../common/mocks/mock.sms.service";
import { SMSService } from "../../common/sms.service";
import { AddPaymentMethodResponse } from "../../psp/domain/AddPaymentMethodResponse";
import { getMockPlaidClientWithDefaults } from "../../psp/mocks/mock.plaid.client";
import { PaymentService } from "../../psp/payment.service";
import { PlaidClient } from "../../psp/plaid.client";
import { ConsumerService } from "../consumer.service";
import { Consumer, ConsumerProps } from "../domain/Consumer";
import { CryptoWallet } from "../domain/CryptoWallet";
import { PaymentMethod, PaymentMethodType } from "../domain/PaymentMethod";
import { PaymentProvider } from "../domain/PaymentProvider";
import { FiatTransactionStatus, PaymentRequestResponse } from "../domain/Types";
import { PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";
import { NotificationMethod } from "../dto/AddCryptoWalletDTO";
import { AddPaymentMethodDTO, PaymentType } from "../dto/AddPaymentMethodDTO";
import { UserEmailUpdateRequest } from "../dto/EmailVerificationDTO";
import { getMockConsumerRepoWithDefaults } from "../mocks/mock.consumer.repo";
import { IConsumerRepo } from "../repos/ConsumerRepo";
import { getMockCircleClientWithDefaults } from "../../psp/mocks/mock.circle.client";
import { CircleClient } from "../../psp/circle.client";

describe("ConsumerService", () => {
  let consumerService: ConsumerService;
  let smsService: SMSService;
  let consumerRepo: IConsumerRepo;
  let notificationService: NotificationService;
  let mockOtpRepo: IOTPRepo;
  let paymentService: PaymentService;
  let sanctionedCryptoWalletService: SanctionedCryptoWalletService;
  let plaidClient: PlaidClient;
  let circleClient: CircleClient;

  jest.setTimeout(30000);

  beforeEach(async () => {
    consumerRepo = getMockConsumerRepoWithDefaults();
    notificationService = getMockNotificationServiceWithDefaults();
    mockOtpRepo = getMockOtpRepoWithDefaults();
    paymentService = getMockPaymentServiceWithDefaults();
    plaidClient = getMockPlaidClientWithDefaults();
    smsService = getMockSmsServiceWithDefaults();
    sanctionedCryptoWalletService = getMockSanctionedCryptoWalletServiceWithDefaults();
    circleClient = getMockCircleClientWithDefaults();

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
          provide: PlaidClient,
          useFactory: () => instance(plaidClient),
        },
        {
          provide: CircleClient,
          useFactory: () => instance(circleClient),
        },
        KmsService,
      ],
    }).compile();

    consumerService = app.get<ConsumerService>(ConsumerService);
  });

  describe("createConsumerIfFirstTimeLogin", () => {
    it("should create user if not present", async () => {
      const email = "mock-user@noba.com";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        email: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
          },
        ],

        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      when(consumerRepo.getConsumerByEmail(email)).thenResolve(Result.fail("not found!"));
      when(consumerRepo.createConsumer(anything())).thenResolve(consumer);

      const response = await consumerService.getOrCreateConsumerConditionally(email);
      expect(response).toStrictEqual(consumer);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_WELCOME_MESSAGE_EVENT,

          deepEqual({
            email: email,
            firstName: undefined,
            lastName: undefined,
            nobaUserID: consumer.props.id,
          }),
        ),
      ).once();
    });
  });

  describe("findConsumerById", () => {
    it("should find the consumer", async () => {
      const email = "mock-user@noba.com";

      const consumerID = "mock-consumer-1";
      const consumer = Consumer.createConsumer({
        id: consumerID,
        email: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
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

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        email: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProvider.CHECKOUT,
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

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(deepEqual(updatedConsumerData))).thenResolve(updatedConsumerData);

      const response = await consumerService.updateConsumer({
        id: consumer.props.id,
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
          id: consumerId,
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

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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

      when(paymentService.addPaymentMethod(deepEqual(consumer), deepEqual(addPaymentMethod))).thenResolve(
        addPaymentMethodResponse,
      );

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);

      when(
        consumerRepo.updateConsumer(deepEqual(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData))),
      ).thenResolve(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData));

      const response = await consumerService.addPaymentMethod(consumer, addPaymentMethod);

      expect(response).toStrictEqual(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData));
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_CARD_ADDED_EVENT,

          deepEqual({
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            email: consumer.props.email,
            cardNetwork: addPaymentMethodResponse.newPaymentMethod.cardData.cardType,
            last4Digits: addPaymentMethodResponse.newPaymentMethod.cardData.last4Digits,
          }),
        ),
      ).once();
    });

    it("throws error when payment method is UNSUPPORTED", async () => {
      const email = "mock-user@noba.com";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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

      when(paymentService.addPaymentMethod(deepEqual(consumer), deepEqual(addPaymentMethod))).thenResolve(
        addPaymentMethodResponse,
      );

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);

      when(consumerRepo.updateConsumer(anything())).thenResolve(
        Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData),
      );

      try {
        await consumerService.addPaymentMethod(consumer, addPaymentMethod);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        verify(
          consumerRepo.updateConsumer(deepEqual(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData))),
        ).once();
      }
    });

    it("adds a payment method of 'ACH' type", async () => {
      const email = "mock-user@noba.com";

      const checkoutCustomerID = "checkout-customer-for-mock-consumer";

      const plaidPublicToken = "public-token-by-plain-embed-ui";
      const plaidAccessToken = "plaid-access-token-for-public-token";
      const plaidAuthGetItemID = "plaid-itemID-for-auth-get-request";
      const plaidAccountID = "plaid-account-id-for-the-consumer-bank-account";
      const plaidCheckoutProcessorToken = "processor-token-for-plaid-checkout-integration";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);

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
        isDefault: false,
      };

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [paymentMethod],
      });

      when(paymentService.addPaymentMethod(deepEqual(consumer), deepEqual(addPaymentMethod))).thenResolve({
        checkoutResponseData: null,
        updatedConsumerData: updatedConsumer.props,
      });

      const expectedConsumerProps: ConsumerProps = {
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [],
      };

      when(consumerRepo.updateConsumer(deepEqual(Consumer.createConsumer(expectedConsumerProps)))).thenResolve(
        Consumer.createConsumer(expectedConsumerProps),
      );

      const response = await consumerService.addPaymentMethod(consumer, addPaymentMethod);

      expect(response).toStrictEqual(Consumer.createConsumer(expectedConsumerProps));
    });
  });

  describe("requestPayment", () => {
    it("should make payment successfully", async () => {
      const email = "mock-user@noba.com";

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
        isDefault: false,
      };
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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

        isAdmin: false,
        paymentMethods: [paymentMethod],
        cryptoWallets: [],
      });

      const transaction = Transaction.createTransaction({
        id: "fake-transaction-id",
        userId: consumer.props.id,
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
        lastProcessingTimestamp: Date.now().valueOf(),
        lastStatusUpdateTimestamp: Date.now().valueOf(),
      });

      const paymentRequestResponse: PaymentRequestResponse = {
        status: PaymentMethodStatus.APPROVED,
        paymentID: "fake-payment-id",
      };

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(
        paymentService.requestCheckoutPayment(deepEqual(consumer), deepEqual(transaction), deepEqual(paymentMethod)),
      ).thenResolve(paymentRequestResponse);

      const response = await consumerService.requestPayment(consumer, transaction);
      expect(response).toStrictEqual(paymentRequestResponse);
    });

    it("should throw error when payment method is DELETED", async () => {
      const email = "mock-user@noba.com";

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
        isDefault: false,
      };
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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

        isAdmin: false,
        paymentMethods: [paymentMethod],
        cryptoWallets: [],
      });

      const transaction = Transaction.createTransaction({
        id: "fake-transaction-id",
        userId: consumer.props.id,
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
        isDefault: false,
      };
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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

        isAdmin: false,
        paymentMethods: [paymentMethod],
        cryptoWallets: [],
      });

      const transaction = Transaction.createTransaction({
        id: "fake-transaction-id",
        userId: consumer.props.id,
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

        lastProcessingTimestamp: Date.now().valueOf(),
        lastStatusUpdateTimestamp: Date.now().valueOf(),
      });

      const paymentRequestResponse: PaymentRequestResponse = {
        status: PaymentMethodStatus.APPROVED,
        paymentID: "fake-payment-id",
      };

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
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

      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [],
      });

      expect(async () => await consumerService.removePaymentMethod(consumer, paymentToken)).rejects.toThrow(
        NotFoundException,
      );

      expect(async () => await consumerService.removePaymentMethod(consumer, paymentToken)).rejects.toThrow(
        "Payment Method id not found",
      );
    });

    it("should throw error when payment provider is not valid", async () => {
      const email = "mock-user@noba.com";

      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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

        isAdmin: false,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: "FakeProvider" as any,
            paymentToken: paymentToken,
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
            },
            imageUri: "fake-uri",
            isDefault: false,
          },
        ],
        cryptoWallets: [],
      });

      try {
        await consumerService.removePaymentMethod(consumer, paymentToken);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect(e.message).toBe("Payment provider not found");
      }
    });

    it("should throw error when payment method is deleted for consumer", async () => {
      const email = "mock-user@noba.com";

      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [],
      });

      expect(async () => await consumerService.removePaymentMethod(consumer, paymentToken)).rejects.toThrow(
        NotFoundException,
      );

      expect(async () => await consumerService.removePaymentMethod(consumer, paymentToken)).rejects.toThrow(
        "Payment Method id not found",
      );
    });

    it("should delete payment method successfully", async () => {
      const email = "mock-user@noba.com";

      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
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
            isDefault: false,
          },
        ],
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(paymentService.removePaymentMethod(paymentToken)).thenResolve();
      when(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).thenResolve(updatedConsumer);

      const response = await consumerService.removePaymentMethod(consumer, paymentToken);
      expect(response).toStrictEqual(updatedConsumer);
      expect(response.props.paymentMethods.length).toBe(1);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_CARD_DELETED_EVENT,

          deepEqual({
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
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
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [],
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);

      const response = await consumerService.getPaymentMethodProvider(consumer.props.id, paymentToken);
      expect(response).toBe(PaymentProvider.CHECKOUT);
    });

    it("throws NotFoundException when paymentToken does not exist for consumer", async () => {
      const paymentToken = "fake-payment-token";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [],
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);

      expect(
        async () => await consumerService.getPaymentMethodProvider(consumer.props.id, "new-fake-payment-token"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws NotFoundException when payment method is deleted for consumer", async () => {
      const paymentToken = "fake-payment-token";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [],
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);

      expect(
        async () => await consumerService.getPaymentMethodProvider(consumer.props.id, paymentToken),
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

      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
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
        isDefault: false,
      };

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [updatedPaymentMethod],
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const response = await consumerService.updatePaymentMethod(consumer.props.id, updatedPaymentMethod);

      expect(response).toStrictEqual(updatedConsumer);
      verify(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).once();
    });

    it("should replace existing default payment method", async () => {
      const email = "mock-user@noba.com";

      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
          },
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token-1",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
            isDefault: true,
          },
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token-2",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
            isDefault: false,
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
        isDefault: true,
      };

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token-2",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
            isDefault: false,
          },
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "fake-token-1",
            cardData: {
              first6Digits: "123456",
              last4Digits: "7890",
              cardType: "VISA",
            },
            imageUri: "fake-uri",
            name: "Fake card",
            isDefault: false,
          },
          updatedPaymentMethod,
        ],
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const response = await consumerService.updatePaymentMethod(consumer.props.id, updatedPaymentMethod);

      expect(response).toStrictEqual(updatedConsumer);
      verify(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).once();
    });

    it("should throw error when paymentToken does not exist for consumer", async () => {
      const email = "mock-user@noba.com";

      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
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
        isDefault: false,
      };

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      expect(
        async () => await consumerService.updatePaymentMethod(consumer.props.id, updatedPaymentMethod),
      ).rejects.toThrow(BadRequestException);
      expect(
        async () => await consumerService.updatePaymentMethod(consumer.props.id, updatedPaymentMethod),
      ).rejects.toThrow(`Payment method with token ${updatedPaymentMethod.paymentToken} does not exist for consumer`);
    });

    it("should throw error when payment method is deleted for consumer", async () => {
      const email = "mock-user@noba.com";

      const paymentToken = "fake-token";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
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
        isDefault: false,
      };

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      expect(
        async () => await consumerService.updatePaymentMethod(consumer.props.id, updatedPaymentMethod),
      ).rejects.toThrow(BadRequestException);
      expect(
        async () => await consumerService.updatePaymentMethod(consumer.props.id, updatedPaymentMethod),
      ).rejects.toThrow(`Payment method with token ${updatedPaymentMethod.paymentToken} does not exist for consumer`);
    });
  });

  describe("confirmWalletUpdateOTP", () => {
    it("updates existing crypto wallet", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";
      const otp = 123456;

      when(sanctionedCryptoWalletService.isWalletSanctioned(walletAddress)).thenResolve(false);

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.PENDING,
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
          },
        ],
      });

      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 5);

      when(mockOtpRepo.getOTP(consumer.props.email, "CONSUMER", consumer.props.id)).thenResolve(
        Otp.createOtp({
          id: "fake-otp-id",
          emailOrPhone: consumer.props.email,
          otp: otp,
          otpExpiryTime: expiryDate.getTime(),
          identityType: "CONSUMER",
          consumerID: consumer.props.id,
        }),
      );

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(mockOtpRepo.deleteOTP("fake-otp-id")).thenResolve();

      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const response = await consumerService.confirmWalletUpdateOTP(
        consumer,
        walletAddress,
        otp,
        consumer.props.id,

        NotificationMethod.EMAIL,
      );

      expect(response).toStrictEqual(updatedConsumer);

      verify(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).once();
    });

    it("throws BadRequestException when cryptoWallet is deleted", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";
      const otp = 123456;

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.DELETED,
          },
        ],
      });

      expect(
        async () =>
          await consumerService.confirmWalletUpdateOTP(
            consumer,
            walletAddress,
            otp,
            consumer.props.id,

            NotificationMethod.EMAIL,
          ),
      ).rejects.toThrow(BadRequestException);
      expect(
        async () =>
          await consumerService.confirmWalletUpdateOTP(
            consumer,
            walletAddress,
            otp,
            consumer.props.id,

            NotificationMethod.EMAIL,
          ),
      ).rejects.toThrow("Crypto wallet does not exist for user");
    });

    it("throws Unauthorized exception when otp is wrong", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";
      const otp = 123456;
      const wrongOtp = 234567;

      when(sanctionedCryptoWalletService.isWalletSanctioned(walletAddress)).thenResolve(false);
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.PENDING,
          },
        ],
      });

      when(mockOtpRepo.getOTP(consumer.props.email, "CONSUMER", consumer.props.id)).thenResolve(
        Otp.createOtp({
          id: "fake-otp-id",
          emailOrPhone: consumer.props.email,
          otp: otp,
          otpExpiryTime: new Date().getTime(),
          identityType: "CONSUMER",
          consumerID: consumer.props.id,
        }),
      );

      try {
        await consumerService.confirmWalletUpdateOTP(
          consumer,
          walletAddress,
          wrongOtp,
          consumer.props.id,

          NotificationMethod.EMAIL,
        );
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
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.PENDING,
          },
        ],
      });

      const response = await consumerService.getCryptoWallet(consumer, walletAddress);
      expect(response).toStrictEqual(consumer.props.cryptoWallets[0]);
    });

    it("returns null when walletAddress does not exist for consumer", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.PENDING,
          },
        ],
      });

      const response = await consumerService.getCryptoWallet(consumer, "new-wallet-address");
      expect(response).toStrictEqual(null);
    });

    it("returns null when wallet is deleted for consumer", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.DELETED,
          },
        ],
      });

      const response = await consumerService.getCryptoWallet(consumer, walletAddress);
      expect(response).toStrictEqual(null);
    });
  });

  describe("removeCryptoWallet", () => {
    it("Sets wallet status to DELETED for user without touching other wallets", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";

      when(sanctionedCryptoWalletService.isWalletSanctioned(walletAddress)).thenResolve(false);
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
            isDefault: false,
          },
        ],
        cryptoWallets: [
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.PENDING,
          },
          {
            walletName: "Other wallet 1",
            address: walletAddress + "1",
            status: WalletStatus.PENDING,
          },
          {
            walletName: "Other wallet 2",
            address: walletAddress + "2",
            status: WalletStatus.PENDING,
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
          },
          {
            walletName: "Other wallet 2",
            address: walletAddress + "2",
            status: WalletStatus.PENDING,
          },
          {
            walletName: "Test wallet",
            address: walletAddress,
            status: WalletStatus.DELETED,
          },
        ],
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const response = await consumerService.removeCryptoWallet(consumer, walletAddress);

      expect(response).toStrictEqual(updatedConsumer);
      verify(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).once();
    });
  });

  describe("addZeroHashParticipantCode", () => {
    it("should add zeroHash participation code to user", async () => {
      const email = "fake+consumer@noba.com";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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

        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [],
      });

      const zhParticipantCode = "fake-zh-participation-code";

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anything())).thenResolve(
        Consumer.createConsumer({
          ...consumer.props,
          zhParticipantCode: zhParticipantCode,
        }),
      );

      const response = await consumerService.addZeroHashParticipantCode(consumer.props.id, zhParticipantCode);
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
    it("should set wallet status to PENDING when wallet status is DELETED and method is called", async () => {
      const cryptoWallet: CryptoWallet = {
        address: "fake-wallet-address",
        status: WalletStatus.DELETED,
      };
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
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
        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [cryptoWallet],
      });

      const toAddCryptoWallet: CryptoWallet = {
        address: "fake-wallet-address",
        status: WalletStatus.PENDING,
      };

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        cryptoWallets: [toAddCryptoWallet],
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).thenResolve(updatedConsumer);
      when(mockOtpRepo.deleteAllOTPsForUser(consumer.props.email, consumerIdentityIdentifier, "123")).thenResolve();
      const response = await consumerService.addOrUpdateCryptoWallet(consumer, toAddCryptoWallet);

      expect(response).toBe(updatedConsumer);
    });

    it("should append to CryptWallets list if the wallet is new", async () => {
      const email = "fake.consumer@noba.com";
      const consumerId = "mock_consumer_id";

      const consumer = Consumer.createConsumer({
        id: consumerId,
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

        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [
          {
            address: "fake_existing_wallet_address",

            status: WalletStatus.APPROVED,
          },
        ],
      });
      when(consumerRepo.getConsumer(consumerId)).thenResolve(consumer);

      const newWallet: CryptoWallet = {
        address: "new-wallet-address",

        status: WalletStatus.PENDING,
      };

      const updatedConsumer: Consumer = consumer;
      updatedConsumer.props.cryptoWallets.push({
        address: "new-wallet-address",
        status: WalletStatus.PENDING,
      });
      when(consumerRepo.updateConsumer(anything())).thenResolve(updatedConsumer);

      const returnedConsumer = await consumerService.addOrUpdateCryptoWallet(consumer, newWallet);

      expect(returnedConsumer).toEqual(updatedConsumer);
      const [updateConsumerCallParams] = capture(consumerRepo.updateConsumer).last();
      expect(updateConsumerCallParams.props.cryptoWallets).toContainEqual({
        address: "new-wallet-address",
        status: WalletStatus.PENDING,
      });
      expect(updateConsumerCallParams.props.cryptoWallets).toContainEqual(consumer.props.cryptoWallets[0]);
    });

    it("should update the 'status' field of CryptoWallet if it's already there", async () => {
      const email = "fake.consumer@noba.com";
      const consumerId = "mock_consumer_id";

      const consumer = Consumer.createConsumer({
        id: consumerId,
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

        isAdmin: false,
        paymentMethods: [],
        cryptoWallets: [
          {
            address: "fake_existing_wallet_address",

            status: WalletStatus.PENDING,
          },
        ],
      });
      when(consumerRepo.getConsumer(consumerId)).thenResolve(consumer);

      const newWallet: CryptoWallet = {
        address: "fake_existing_wallet_address",

        status: WalletStatus.REJECTED,
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
      });
    });
  });

  describe("sendOtpToPhone", () => {
    it("should send otp to given phone number with given context", async () => {
      const phone = "+12434252";
      when(smsService.sendSMS(phone, anyString())).thenResolve();
      when(mockOtpRepo.saveOTPObject(anything())).thenResolve();
      when(mockOtpRepo.deleteAllOTPsForUser(phone, consumerIdentityIdentifier, "123")).thenResolve();
      await consumerService.sendOtpToPhone("123", phone);
      verify(smsService.sendSMS(phone, anyString())).once();
      verify(mockOtpRepo.saveOTPObject(anything())).once();
    });
  });

  describe("updateConsumerPhone", () => {
    it("incorrect and correct otp", async () => {
      const phone = "+12434252";
      const email = "a@noba.com";

      const otp = 123456;

      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
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

        isAdmin: false,
      });

      const otpObject = Otp.createOtp({
        otp: otp,
        emailOrPhone: phone,
        identityType: IdentityType.consumer,
        consumerID: consumer.props.id,
      });

      const phoneUpdateRequest: UserPhoneUpdateRequest = {
        phone: phone,
        otp: 123458, //incorrect otp
      };

      const expectedUpdatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        phone: phone,
      });

      when(consumerRepo.getConsumerByEmail(email)).thenResolve(Result.fail("not found!"));
      when(mockOtpRepo.getOTP(phone, IdentityType.consumer, consumer.props.id)).thenResolve(otpObject);

      try {
        await consumerService.updateConsumerPhone(consumer, phoneUpdateRequest);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(BadRequestException);
      }

      phoneUpdateRequest.otp = otp; //correct otp
      when(consumerRepo.getConsumerByPhone(phone)).thenResolve(Result.fail(anything()));
      when(mockOtpRepo.deleteOTP(otpObject.props._id)).thenResolve();
      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anything())).thenResolve(expectedUpdatedConsumer);

      const updateConsumerResponse = await consumerService.updateConsumerPhone(consumer, phoneUpdateRequest);
      verify(consumerRepo.updateConsumer(anything())).once();
      const [requestArg] = capture(consumerRepo.updateConsumer).last();
      expect(requestArg.props.phone).toBe(phone);
      expect(updateConsumerResponse).toEqual(expectedUpdatedConsumer);
    });

    it("doesn't update user if identifier already exists", async () => {
      const phone = "+12434252";
      const email = "a@noba.com";

      const otp = 123456;

      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
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

        isAdmin: false,
      });

      const otpObject = Otp.createOtp({
        otp: otp,
        emailOrPhone: phone,
        identityType: IdentityType.consumer,
        consumerID: consumer.props.id,
      });

      const phoneUpdateRequest: UserPhoneUpdateRequest = {
        phone: phone,
        otp: otp, //correct otp
      };

      when(consumerRepo.getConsumerByPhone(phone)).thenResolve(Result.ok(anything()));
      when(mockOtpRepo.getOTP(phone, IdentityType.consumer, consumer.props.id)).thenResolve(otpObject);
      when(mockOtpRepo.deleteOTP(otpObject.props._id)).thenResolve();

      try {
        await consumerService.updateConsumerPhone(consumer, phoneUpdateRequest);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toEqual("User already exists with this phone number");
      }

      expect(consumer.props.phone).toBeUndefined();
    });
  });

  describe("sendOtpToEmail", () => {
    it("should send otp to given email address with given context", async () => {
      const email = "Rosie@Noba.com";
      const firstName = "Rosie";
      const otp = 654321;

      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
        firstName: firstName,
        lastName: "Consumer",

        isAdmin: false,
        phone: "+15559993333",
      });

      jest.spyOn(Utils, "generateOTP").mockReturnValueOnce(otp);
      when(
        notificationService.sendNotification(NotificationEventType.SEND_OTP_EVENT, {
          email: email,
          otp: otp.toString(),
          firstName: "Rosie",
        }),
      ).thenResolve();
      when(mockOtpRepo.saveOTPObject(anything())).thenResolve();
      when(mockOtpRepo.deleteAllOTPsForUser(email, consumerIdentityIdentifier, consumer.props.id)).thenResolve();
      await consumerService.sendOtpToEmail(email, consumer);
      verify(mockOtpRepo.saveOTP(email, otp, consumerIdentityIdentifier, consumer.props.id)).once();
    });
  });

  describe("updateConsumerEmail", () => {
    it("incorrect and correct otp", async () => {
      const phone = "+12434252";
      const email = "Rosie@Noba.com";

      const otp = 123456;
      const otpObject = Otp.createOtp({
        otp: otp,
        emailOrPhone: email,
        identityType: IdentityType.consumer,
      });

      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
        firstName: "Mock",
        lastName: "Consumer",

        isAdmin: false,
        phone: phone,
      });

      const emailUpdateRequest: UserEmailUpdateRequest = {
        email: email,
        otp: 123458, //incorrect otp
      };

      when(mockOtpRepo.getOTP(email, IdentityType.consumer)).thenResolve(otpObject);
      when(mockOtpRepo.deleteOTP(otpObject.props._id)).thenResolve();

      try {
        await consumerService.updateConsumerEmail(consumer, emailUpdateRequest);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(BadRequestException);
      }

      emailUpdateRequest.otp = otp; //correct otp

      when(consumerRepo.getConsumerByEmail(email.toLowerCase())).thenResolve(Result.fail(anything()));
      const expectedUpdatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        email: email.toLowerCase(),
        displayEmail: email,
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anything())).thenResolve(expectedUpdatedConsumer);
      when(
        notificationService.sendNotification(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT, {
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

      verify(notificationService.sendNotification(anything(), anything())).once();
      const [notificationType, notificationUserArgs] = capture(notificationService.sendNotification).last();
      expect(notificationType).toBe(NotificationEventType.SEND_WELCOME_MESSAGE_EVENT);
      expect(notificationUserArgs).toStrictEqual({
        email: email.toLowerCase(),
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        nobaUserID: consumer.props.id,
      });

      //update consumer again, this time notification shouldn't be sent
      await consumerService.updateConsumerEmail(updateConsumerResponse, emailUpdateRequest);
      verify(notificationService.sendNotification(anything(), anything())).once(); //already called above
    });

    it("doesn't update user if identifier already exists", async () => {
      const phone = "+12434252";
      const email = "Rosie@Noba.com";

      const otp = 123456;
      const otpObject = Otp.createOtp({
        otp: otp,
        emailOrPhone: email,
        identityType: IdentityType.consumer,
      });

      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
        firstName: "Mock",
        lastName: "Consumer",

        isAdmin: false,
        phone: phone,
      });

      const emailUpdateRequest: UserEmailUpdateRequest = {
        email: email,
        otp: otp, //correct otp
      };

      when(consumerRepo.getConsumerByEmail(email.toLowerCase())).thenResolve(Result.ok(anything()));
      when(mockOtpRepo.getOTP(email, IdentityType.consumer)).thenResolve(otpObject);
      when(mockOtpRepo.deleteOTP(otpObject.props._id)).thenResolve();

      try {
        await consumerService.updateConsumerEmail(consumer, emailUpdateRequest);
        expect(true).toBe(false);
      } catch (err) {
        console.log(err);
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toEqual("User already exists with this email address");
      }

      expect(consumer.props.email).toBeUndefined();
      expect(consumer.props.displayEmail).toBeUndefined();
    });
  });

  describe("isHandleAvaialable", () => {
    it("should throw BadRequestException if 'handle' is less than 3 characters", async () => {
      try {
        await consumerService.isHandleAvailable("ab");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toBe("'handle' should be between 3 and 15 charcters long.");
      }
    });

    it("should throw BadRequestException if 'handle' is greater than 15 characters", async () => {
      try {
        await consumerService.isHandleAvailable("abcdefghijklmnopqrstu");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toBe("'handle' should be between 3 and 15 charcters long.");
      }
    });

    it("should throw BadRequestException if 'handle' starts with an underscore", async () => {
      try {
        await consumerService.isHandleAvailable("-abcd");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toBe(
          "'handle' can't start with an '-' and can only contain alphanumeric characters & '-'.",
        );
      }
    });

    it("should throw BadRequestException if 'handle' has special characters other than underscore", async () => {
      try {
        await consumerService.isHandleAvailable("ab_");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toBe(
          "'handle' can't start with an '-' and can only contain alphanumeric characters & '-'.",
        );
      }
    });

    it("should throw BadRequestException if 'handle' correspond to a spanish 'bad word'", async () => {
      try {
        await consumerService.isHandleAvailable("pendejo");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toBe("Specified 'handle' is reserved. Please choose a different one.");
      }
    });

    it("should throw BadRequestException if 'handle' correspond to a english 'bad word'", async () => {
      try {
        await consumerService.isHandleAvailable("asshole");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toBe("Specified 'handle' is reserved. Please choose a different one.");
      }
    });

    it("should return 'true' if 'handle' has hiphen in between", async () => {
      when(consumerRepo.isHandleTaken("ab-cd")).thenResolve(false);

      const isHandleAvaialble = await consumerService.isHandleAvailable("ab-cd");
      expect(isHandleAvaialble).toBe(true);
    });

    it("should return 'false' if the handle is already taken", async () => {
      when(consumerRepo.isHandleTaken("test")).thenResolve(true);

      const isHandleAvaialble = await consumerService.isHandleAvailable("test");
      expect(isHandleAvaialble).toBe(false);
    });

    it("should return 'true' if the handle is not taken", async () => {
      when(consumerRepo.isHandleTaken("test")).thenResolve(false);

      const isHandleAvaialble = await consumerService.isHandleAvailable("test");
      expect(isHandleAvaialble).toBe(true);
    });
  });

  describe("getConsumerCircleWalletID", () => {
    it("should return the circleWalletID if already present in the Consumer record", async () => {
      const consumerID = "mock_consumer_id";
      when(consumerRepo.getConsumer(anyString())).thenResolve(
        Consumer.createConsumer({
          id: consumerID,
          firstName: "firstName",
          lastName: "lastName",
          email: "test@noba.com",
          phone: "+9876541230",
          handle: "test",
          circleWalletID: "mock_circle_wallet_id",
        }),
      );

      const receivedCircleWalletID = await consumerService.getConsumerCircleWalletID(consumerID);

      expect(receivedCircleWalletID).toBe("mock_circle_wallet_id");
      const [getConsumerMethodParam] = capture(consumerRepo.getConsumer).last();
      expect(getConsumerMethodParam).toBe(consumerID);
    });

    it("should call the Circle client to create a new Wallet & also update the Consumer record if the circleWalletID if not present in the Consumer record", async () => {
      const consumerID = "mock_consumer_id";
      const circleWalletID = "mock_circle_wallet_id";

      when(consumerRepo.getConsumer(anyString())).thenResolve(
        Consumer.createConsumer({
          id: consumerID,
          firstName: "firstName",
          lastName: "lastName",
          email: "test@noba.com",
          phone: "+9876541230",
          handle: "test",
        }),
      );
      when(circleClient.createWallet(anyString())).thenResolve(circleWalletID);
      when(consumerRepo.updateConsumerCircleWalletID(anyString(), anyString())).thenResolve();

      const receivedCircleWalletID = await consumerService.getConsumerCircleWalletID(consumerID);

      const [getConsumerMethodParam] = capture(consumerRepo.getConsumer).last();
      expect(getConsumerMethodParam).toBe(consumerID);
      const [createWalletMethodParams] = capture(circleClient.createWallet).last();
      expect(createWalletMethodParams).toBe(consumerID);

      expect(receivedCircleWalletID).toBe(circleWalletID);

      const [updateConsumerConsumerIdParam, updateConsumerCircleWalletIdParam] = capture(
        consumerRepo.updateConsumerCircleWalletID,
      ).last();
      expect(updateConsumerConsumerIdParam).toBe(consumerID);
      expect(updateConsumerCircleWalletIdParam).toBe(circleWalletID);
    });

    it("should throw error if the consumerRepo throws it", async () => {
      when(consumerRepo.getConsumer("mock_consumer_id")).thenReject(new BadRequestException());
      try {
        await consumerService.getConsumerCircleWalletID("mock_consumer_id");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
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
        isDefault: false,
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
