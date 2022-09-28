import { Test, TestingModule } from "@nestjs/testing";
import { getMockOtpRepoWithDefaults } from "../../../modules/auth/mocks/MockOtpRepo";
import { IOTPRepo } from "../../../modules/auth/repo/OTPRepo";
import { anyString, anything, deepEqual, instance, verify, when } from "ts-mockito";
import { CHECKOUT_CONFIG_KEY, CHECKOUT_PUBLIC_KEY, CHECKOUT_SECRET_KEY } from "../../../config/ConfigurationUtils";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { CheckoutService } from "../../../modules/common/checkout.service";
import { SanctionedCryptoWalletService } from "../../../modules/common/sanctionedcryptowallet.service";
import { EmailService } from "../../../modules/common/email.service";
import { KmsService } from "../../../modules/common/kms.service";
import { getMockEmailServiceWithDefaults } from "../../../modules/common/mocks/mock.email.service";
import { ConsumerService } from "../consumer.service";
import { Consumer } from "../domain/Consumer";
import { PaymentProviders } from "../domain/PaymentProviderDetails";
import { getMockConsumerRepoWithDefaults } from "../mocks/mock.consumer.repo";
import { IConsumerRepo } from "../repos/ConsumerRepo";
import { Result } from "../../../core/logic/Result";
import { getMockCheckoutServiceWithDefaults } from "../../../modules/common/mocks/mock.checkout.service";
import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { AddPaymentMethodDTO } from "../dto/AddPaymentMethodDTO";
import { CheckoutResponseData } from "../../../modules/common/domain/CheckoutResponseData";
import { PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";
import { AddPaymentMethodResponse } from "../../../modules/common/domain/AddPaymentMethodResponse";
import { Transaction } from "../../../modules/transactions/domain/Transaction";
import { TransactionStatus } from "../../../modules/transactions/domain/Types";
import { FiatTransactionStatus, PaymentRequestResponse } from "../domain/Types";
import { PaymentMethod } from "../domain/PaymentMethod";
import { Otp } from "../../../modules/auth/domain/Otp";
import { getMockSanctionedCryptoWalletServiceWithDefaults } from "../../../modules/common/mocks/mock.sanctionedcryptowallet.service.spec";

describe("ConsumerService", () => {
  let consumerService: ConsumerService;
  let consumerRepo: IConsumerRepo;
  let emailService: EmailService;
  let mockOtpRepo: IOTPRepo;
  let checkoutService: CheckoutService;
  let sanctionedCryptoWalletService: SanctionedCryptoWalletService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    consumerRepo = getMockConsumerRepoWithDefaults();
    emailService = getMockEmailServiceWithDefaults();
    mockOtpRepo = getMockOtpRepoWithDefaults();
    checkoutService = getMockCheckoutServiceWithDefaults();
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
          provide: EmailService,
          useFactory: () => instance(emailService),
        },
        {
          provide: "OTPRepo",
          useFactory: () => instance(mockOtpRepo),
        },
        {
          provide: CheckoutService,
          useFactory: () => instance(checkoutService),
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
            providerID: PaymentProviders.CHECKOUT,
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
      when(emailService.sendWelcomeMessage(email, undefined, undefined)).thenResolve();

      const response = await consumerService.createConsumerIfFirstTimeLogin(email, partnerId);
      expect(response).toStrictEqual(consumer);
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
            providerID: PaymentProviders.CHECKOUT,
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

      const response = await consumerService.createConsumerIfFirstTimeLogin(email, partnerId);
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
            providerID: PaymentProviders.CHECKOUT,
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

      const response = await consumerService.createConsumerIfFirstTimeLogin(email, partnerId);

      expect(response).toStrictEqual(consumer);
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
            providerID: PaymentProviders.CHECKOUT,
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
    it("adds a payment method for checkout", async () => {
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
            providerID: PaymentProviders.CHECKOUT,
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
        cardNumber: "1234567890",
        expiryMonth: 8,
        expiryYear: 2023,
        cvv: "123",
      };

      const addPaymentMethodResponse: AddPaymentMethodResponse = constructAddPaymentMethodResponse(
        consumer,
        PaymentMethodStatus.APPROVED,
      );

      when(checkoutService.addPaymentMethod(deepEqual(consumer), deepEqual(addPaymentMethod))).thenResolve(
        addPaymentMethodResponse,
      );

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);

      when(
        consumerRepo.updateConsumer(deepEqual(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData))),
      ).thenResolve(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData));

      when(
        emailService.sendCardAddedEmail(
          consumer.props.firstName,
          consumer.props.lastName,
          consumer.props.email,
          addPaymentMethodResponse.newPaymentMethod.cardType,
          addPaymentMethodResponse.newPaymentMethod.last4Digits,
        ),
      ).thenResolve();

      const response = await consumerService.addPaymentMethod(consumer, addPaymentMethod);

      expect(response).toStrictEqual(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData));
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
            providerID: PaymentProviders.CHECKOUT,
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
        cardNumber: "1234567890",
        expiryMonth: 8,
        expiryYear: 2023,
        cvv: "123",
      };

      const addPaymentMethodResponse: AddPaymentMethodResponse = constructAddPaymentMethodResponse(
        consumer,
        PaymentMethodStatus.UNSUPPORTED,
      );

      when(checkoutService.addPaymentMethod(deepEqual(consumer), deepEqual(addPaymentMethod))).thenResolve(
        addPaymentMethodResponse,
      );

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);

      when(consumerRepo.updateConsumer(anything())).thenResolve(
        Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData),
      );

      when(
        emailService.sendCardAddedEmail(
          consumer.props.firstName,
          consumer.props.lastName,
          consumer.props.email,
          addPaymentMethodResponse.newPaymentMethod.cardType,
          addPaymentMethodResponse.newPaymentMethod.last4Digits,
        ),
      ).thenResolve();
      try {
        await consumerService.addPaymentMethod(consumer, addPaymentMethod);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        verify(
          consumerRepo.updateConsumer(deepEqual(Consumer.createConsumer(addPaymentMethodResponse.updatedConsumerData))),
        ).once();
      }
    });
  });

  describe("requestPayment", () => {
    it("should make payment successfully", async () => {
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
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: "Checkout",
            paymentToken: paymentToken,
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
          },
        ],
        cryptoWallets: [],
      });

      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props._id,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        paymentMethodID: paymentToken,
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
      when(checkoutService.requestCheckoutPayment(deepEqual(consumer), deepEqual(transaction))).thenResolve(
        paymentRequestResponse,
      );

      const response = await consumerService.requestPayment(consumer, transaction);
      expect(response).toStrictEqual(paymentRequestResponse);
    });

    it("should throw error when payment provider is not supported", async () => {
      const email = "mock-user@noba.com";
      const partnerId = "partner-1";
      const paymentToken = "fake-token";
      const paymentProvider = "FakeProvider";
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: paymentProvider,
            paymentToken: paymentToken,
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
          },
        ],
        cryptoWallets: [],
      });

      const transaction = Transaction.createTransaction({
        _id: "fake-transaction-id",
        userId: consumer.props._id,
        transactionStatus: TransactionStatus.FIAT_INCOMING_INITIATED,
        paymentMethodID: paymentToken,
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
      when(checkoutService.requestCheckoutPayment(deepEqual(consumer), deepEqual(transaction))).thenResolve(
        paymentRequestResponse,
      );

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
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: "Checkout",
            paymentToken: "fake-token-2",
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
          },
        ],
        cryptoWallets: [],
      });

      try {
        await consumerService.removePaymentMethod(consumer, paymentToken);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect(e.message).toBe("Payment Method id not found");
      }
    });

    it("should throw error when payment provider is not valid", async () => {
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
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: "FakeProvider",
            paymentToken: paymentToken,
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
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
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: "Checkout",
            paymentToken: paymentToken,
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
            cardName: "Fake card",
            cardType: "VISA",
          },
        ],
        cryptoWallets: [],
      });

      const updatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        paymentMethods: [],
      });

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(checkoutService.removePaymentMethod(paymentToken)).thenResolve();
      when(
        emailService.sendCardDeletedEmail(anyString(), anyString(), anyString(), anyString(), anyString()),
      ).thenResolve();
      when(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).thenResolve(updatedConsumer);

      const response = await consumerService.removePaymentMethod(consumer, paymentToken);
      expect(response).toStrictEqual(updatedConsumer);
      expect(response.props.paymentMethods.length).toBe(0);
      verify(
        emailService.sendCardDeletedEmail(
          consumer.props.firstName,
          consumer.props.lastName,
          consumer.props.email,
          consumer.props.paymentMethods[0].cardType,
          consumer.props.paymentMethods[0].last4Digits,
        ),
      ).once();
    });
  });

  describe("getFiatPaymentStatus", () => {
    it("returns fiat payment status successfully", async () => {
      const paymentToken = "fake-token";
      const paymentProvider = PaymentProviders.CHECKOUT;

      when(checkoutService.getFiatPaymentStatus(paymentToken)).thenResolve(FiatTransactionStatus.AUTHORIZED);

      const response = await consumerService.getFiatPaymentStatus(paymentToken, paymentProvider);

      expect(response).toBe(FiatTransactionStatus.AUTHORIZED);
    });

    it("throws error when payment provider is not supported", async () => {
      const paymentToken = "fake-token";
      const paymentProvider = "FakeProvider";

      when(checkoutService.getFiatPaymentStatus(paymentToken)).thenResolve(FiatTransactionStatus.AUTHORIZED);

      try {
        await consumerService.getFiatPaymentStatus(paymentToken, paymentProvider as PaymentProviders);
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
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: "Checkout",
            paymentToken: paymentToken,
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
            cardName: "Fake card",
            cardType: "VISA",
          },
        ],
        cryptoWallets: [],
      });

      const updatedPaymentMethod: PaymentMethod = {
        paymentProviderID: "Checkout",
        paymentToken: paymentToken,
        first6Digits: "123456",
        last4Digits: "7890",
        imageUri: "fake-uri",
        cardName: "New Fake Name",
        cardType: "VISA",
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
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: "Checkout",
            paymentToken: paymentToken,
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
            cardName: "Fake card",
            cardType: "VISA",
          },
        ],
        cryptoWallets: [],
      });

      const updatedPaymentMethod: PaymentMethod = {
        paymentProviderID: "Checkout",
        paymentToken: "new-token",
        first6Digits: "123456",
        last4Digits: "7890",
        imageUri: "fake-uri",
        cardName: "New Fake Name",
        cardType: "VISA",
      };

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);

      try {
        await consumerService.updatePaymentMethod(consumer.props._id, updatedPaymentMethod);
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe(
          `Payment method with token ${updatedPaymentMethod.paymentToken} does not exist for consumer`,
        );
      }
    });
  });

  describe("confirmWalletUpdateOTP", () => {
    it("update existing crypto wallet", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";
      const otp = 123456;

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
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: "Checkout",
            paymentToken: "fake-token",
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
            cardName: "Fake card",
            cardType: "VISA",
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

      when(mockOtpRepo.getOTP(consumer.props.email, "CONSUMER")).thenResolve(
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

      const response = await consumerService.confirmWalletUpdateOTP(consumer, walletAddress, otp);

      expect(response).toStrictEqual(updatedConsumer);

      verify(consumerRepo.updateConsumer(deepEqual(updatedConsumer))).once();
    });

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
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: "Checkout",
            paymentToken: "fake-token",
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
            cardName: "Fake card",
            cardType: "VISA",
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

      when(mockOtpRepo.getOTP(consumer.props.email, "CONSUMER")).thenResolve(
        Otp.createOtp({
          _id: "fake-otp-id",
          emailOrPhone: consumer.props.email,
          otp: otp,
          otpExpiryTime: new Date().getTime(),
          identityType: "CONSUMER",
        }),
      );

      try {
        await consumerService.confirmWalletUpdateOTP(consumer, walletAddress, wrongOtp);
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
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: "Checkout",
            paymentToken: "fake-token",
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
            cardName: "Fake card",
            cardType: "VISA",
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
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: "Checkout",
            paymentToken: "fake-token",
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
            cardName: "Fake card",
            cardType: "VISA",
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
  });

  describe("removeCryptoWallet", () => {
    it("Removes crypto wallet for user", async () => {
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
            providerID: PaymentProviders.CHECKOUT,
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
            paymentProviderID: "Checkout",
            paymentToken: "fake-token",
            first6Digits: "123456",
            last4Digits: "7890",
            imageUri: "fake-uri",
            cardName: "Fake card",
            cardType: "VISA",
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
        cryptoWallets: [],
      });

      when(consumerRepo.getConsumer(consumer.props._id)).thenResolve(consumer);
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
        _id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        paymentProviderAccounts: [
          {
            providerCustomerID: "test-customer-1",
            providerID: PaymentProviders.CHECKOUT,
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
});

function constructAddPaymentMethodResponse(
  consumer: Consumer,
  paymentMethodStatus: PaymentMethodStatus,
): AddPaymentMethodResponse {
  const updatedConsumer = Consumer.createConsumer({
    ...consumer.props,
    paymentMethods: [
      {
        first6Digits: "123456",
        last4Digits: "7890",
        imageUri: "fake-uri",
        paymentToken: "fake-token",
        paymentProviderID: "Checkout",
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
