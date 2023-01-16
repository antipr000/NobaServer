import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { anyNumber, anyString, anything, capture, deepEqual, instance, verify, when } from "ts-mockito";
import { UserPhoneUpdateRequest } from "../../../../test/api_client/models/UserPhoneUpdateRequest";
import {
  CHECKOUT_CONFIG_KEY,
  CHECKOUT_PUBLIC_KEY,
  CHECKOUT_SECRET_KEY,
  STATIC_DEV_OTP,
} from "../../../config/ConfigurationUtils";
import { Result } from "../../../core/logic/Result";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { Utils } from "../../../core/utils/Utils";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { getMockOTPServiceWithDefaults } from "../../common/mocks/mock.otp.service";
import { KmsService } from "../../../modules/common/kms.service";
import { SanctionedCryptoWalletService } from "../../../modules/common/sanctionedcryptowallet.service";
import { NotificationEventType } from "../../../modules/notifications/domain/NotificationTypes";
import { getMockNotificationServiceWithDefaults } from "../../../modules/notifications/mocks/mock.notification.service";
import { NotificationService } from "../../../modules/notifications/notification.service";
import { getMockPaymentServiceWithDefaults } from "../../../modules/psp/mocks/mock.payment.service";
import { consumerIdentityIdentifier, IdentityType } from "../../auth/domain/IdentityType";
import { getMockSanctionedCryptoWalletServiceWithDefaults } from "../../common/mocks/mock.sanctionedcryptowallet.service";
import { getMockSmsServiceWithDefaults } from "../../common/mocks/mock.sms.service";
import { SMSService } from "../../common/sms.service";
import { getMockPlaidClientWithDefaults } from "../../psp/mocks/mock.plaid.client";
import { PaymentService } from "../../psp/payment.service";
import { PlaidClient } from "../../psp/plaid.client";
import { ConsumerService } from "../consumer.service";
import { Consumer } from "../domain/Consumer";
import { CryptoWallet } from "../domain/CryptoWallet";
import { PaymentMethod, PaymentMethodProps } from "../domain/PaymentMethod";
import { FiatTransactionStatus } from "../domain/Types";
import { NotificationMethod } from "../dto/AddCryptoWalletDTO";
import { UserEmailUpdateRequest } from "../dto/EmailVerificationDTO";
import { getMockConsumerRepoWithDefaults } from "../mocks/mock.consumer.repo";
import { IConsumerRepo } from "../repos/consumer.repo";
import { getMockCircleClientWithDefaults } from "../../psp/mocks/mock.circle.client";
import { CircleClient } from "../../psp/circle.client";
import { OTPService } from "../../../modules/common/otp.service";
import { PaymentMethodStatus, PaymentMethodType, PaymentProvider, WalletStatus } from "@prisma/client";
import { QRService } from "../../../modules/common/qrcode.service";
import { getMockQRServiceWithDefaults } from "../../../modules/common/mocks/mock.qr.service";

describe("ConsumerService", () => {
  let consumerService: ConsumerService;
  let smsService: SMSService;
  let consumerRepo: IConsumerRepo;
  let notificationService: NotificationService;
  let otpService: OTPService;
  let paymentService: PaymentService;
  let sanctionedCryptoWalletService: SanctionedCryptoWalletService;
  let plaidClient: PlaidClient;
  let circleClient: CircleClient;
  let qrService: QRService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    consumerRepo = getMockConsumerRepoWithDefaults();
    notificationService = getMockNotificationServiceWithDefaults();
    otpService = getMockOTPServiceWithDefaults();
    paymentService = getMockPaymentServiceWithDefaults();
    plaidClient = getMockPlaidClientWithDefaults();
    smsService = getMockSmsServiceWithDefaults();
    sanctionedCryptoWalletService = getMockSanctionedCryptoWalletServiceWithDefaults();
    circleClient = getMockCircleClientWithDefaults();
    qrService = getMockQRServiceWithDefaults();

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
          [STATIC_DEV_OTP]: 111111,
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
          provide: OTPService,
          useFactory: () => instance(otpService),
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
        {
          provide: QRService,
          useFactory: () => instance(qrService),
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

  describe("getConsumerHandle", () => {
    it("should return handle", async () => {
      const email = "mock-user@noba.com";
      const consumerID = "mock-consumer-1";
      const handle = "mock-handle";

      const consumer = Consumer.createConsumer({
        email: email,
        id: consumerID,
        handle: handle,
      });

      when(consumerRepo.getConsumer(consumerID)).thenResolve(consumer);

      const response = await consumerService.getConsumerHandle(consumerID);

      expect(response).toBe(handle);
    });

    it("should return null if consumer id is not found", async () => {
      const consumerID = "mock-consumer-1";
      when(consumerRepo.getConsumer(consumerID)).thenResolve(null);

      const response = await consumerService.getConsumerHandle(consumerID);
      expect(response).toBeNull();
    });
  });

  describe("updateConsumer", () => {
    it("should update consumer details", async () => {
      const email = "mock-user@noba.com";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        email: email,
      });

      const firstName = "First";
      const lastName = "Last";

      const updatedConsumerData = Consumer.createConsumer({
        ...consumer.props,
        firstName: firstName,
        lastName: lastName,
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(
        consumerRepo.updateConsumer(
          consumer.props.id,
          deepEqual({
            id: consumer.props.id,
            firstName: firstName,
            lastName: lastName,
          }),
        ),
      ).thenResolve(updatedConsumerData);

      const response = await consumerService.updateConsumer({
        id: consumer.props.id,
        firstName: firstName,
        lastName: lastName,
      });

      expect(response).toStrictEqual(updatedConsumerData);
    });

    it("should not auto-generate a handle if updating firstName and handle does exist", async () => {
      const email = "mock-user@noba.com";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        email: email,
      });
      const firstName = "test.test";
      const lastName = "Last";

      const updatedConsumerData = Consumer.createConsumer({
        ...consumer.props,
        firstName: firstName,
        lastName: lastName,
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(
        consumerRepo.updateConsumer(
          consumer.props.id,
          deepEqual({
            id: consumer.props.id,
            firstName: firstName,
            lastName: lastName,
          }),
        ),
      ).thenResolve(updatedConsumerData);

      const returnedResult = await consumerService.updateConsumer({
        id: consumer.props.id,
        firstName: firstName,
        lastName: lastName,
      });

      const [updateCallConsumerID, updateConsumerCall] = capture(consumerRepo.updateConsumer).last();
      expect(updateCallConsumerID).toBe(consumer.props.id);
      expect(updateConsumerCall.handle).toBeUndefined();

      expect(returnedResult.props.handle).toBeUndefined();
    });

    it("should add a 'default' handle which doesn't have 'dots' (.) even if firstname has it", async () => {
      const email = "mock-user@noba.com";
      const firstName = "test.test";
      const lastName = "Last";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        email: email,
        firstName: firstName,
      });

      const updatedConsumerData = Consumer.createConsumer({
        ...consumer.props,
        firstName: firstName,
        lastName: lastName,
        handle: "<PLACEHOLDER_AS_HANDLE_IS_RANDOM>",
      });

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(
        consumerRepo.updateConsumer(
          consumer.props.id,
          deepEqual({
            id: consumer.props.id,
            firstName: firstName,
            lastName: lastName,
            handle: anything(),
          }),
        ),
      ).thenResolve(updatedConsumerData);

      const returnedResult = await consumerService.updateConsumer({
        id: consumer.props.id,
        firstName: firstName,
        lastName: lastName,
      });

      const [updateCallConsumerID, updateConsumerCall] = capture(consumerRepo.updateConsumer).last();
      expect(updateCallConsumerID).toBe(consumer.props.id);
      expect(updateConsumerCall.handle).toBeDefined();
      expect(updateConsumerCall.handle.indexOf(".")).toBe(-1);
      expect(updateConsumerCall.handle.indexOf("_")).toBe(-1);
      expect(updateConsumerCall.handle.length).toBeGreaterThanOrEqual(3);
      expect(updateConsumerCall.handle.length).toBeLessThanOrEqual(22);
      expect(updateConsumerCall.handle[0] != "-").toBeTruthy();

      expect(returnedResult.props.handle).toBeDefined();
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

  describe("removePaymentMethod", () => {
    it("should throw error when payment method id does not exist for the consumer", async () => {
      const email = "mock-user@noba.com";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
      });

      when(consumerRepo.getPaymentMethodForConsumer("fake-card-id", consumer.props.id)).thenReturn(null);

      expect(async () => await consumerService.removePaymentMethod(consumer, "fake-card-id")).rejects.toThrow(
        NotFoundException,
      );

      expect(async () => await consumerService.removePaymentMethod(consumer, "fake-card-id")).rejects.toThrow(
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
      });

      const paymentMethod = PaymentMethod.createPaymentMethod({
        type: PaymentMethodType.CARD,
        paymentProvider: "FakeProvider" as any,
        paymentToken: paymentToken,
        cardData: {} as any,
        imageUri: "fake-uri",
        isDefault: false,
        id: "fake-pm-id",
        consumerID: consumer.props.id,
        status: PaymentMethodStatus.APPROVED,
      });

      when(consumerRepo.getPaymentMethodForConsumer("fake-pm-id", consumer.props.id)).thenResolve(paymentMethod);

      expect(async () => await consumerService.removePaymentMethod(consumer, "fake-pm-id")).rejects.toThrow(
        NotFoundException,
      );
      expect(async () => await consumerService.removePaymentMethod(consumer, "fake-pm-id")).rejects.toThrow(
        "Payment provider not found",
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
      });

      const paymentMethod = PaymentMethod.createPaymentMethod({
        type: PaymentMethodType.CARD,
        paymentProvider: PaymentProvider.CHECKOUT,
        paymentToken: paymentToken,
        cardData: {
          id: "card-id",
          scheme: "VISA",
          first6Digits: "123456",
          last4Digits: "7890",
          authCode: "100000",
          authReason: "Approved",
          cardType: "Credit",
          paymentMethodID: "fake-method",
        },
        imageUri: "fake-uri",
        name: "Fake card",
        status: PaymentMethodStatus.APPROVED,
        isDefault: false,
        id: "fake-id",
        consumerID: consumer.props.id,
      });

      when(paymentService.removePaymentMethod(anyString())).thenResolve();
      when(consumerRepo.getPaymentMethodForConsumer("fake-id", consumer.props.id)).thenResolve(paymentMethod);
      when(
        consumerRepo.updatePaymentMethod("fake-id", deepEqual({ id: "fake-id", status: PaymentMethodStatus.DELETED })),
      ).thenResolve();

      await consumerService.removePaymentMethod(consumer, "fake-id");

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_CARD_DELETED_EVENT,

          deepEqual({
            firstName: consumer.props.firstName,
            lastName: consumer.props.lastName,
            nobaUserID: consumer.props.id,
            email: consumer.props.email,
            cardNetwork: paymentMethod.props.cardData.cardType,
            last4Digits: paymentMethod.props.cardData.last4Digits,
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
      });

      const paymentMethod = PaymentMethod.createPaymentMethod({
        type: PaymentMethodType.CARD,
        paymentProvider: PaymentProvider.CHECKOUT,
        paymentToken: paymentToken,
        cardData: {
          id: "card-id",
          scheme: "VISA",
          first6Digits: "123456",
          last4Digits: "7890",
          authCode: "100000",
          authReason: "Approved",
          cardType: "Credit",
          paymentMethodID: "fake-method",
        },
        imageUri: "fake-uri",
        name: "Fake card",
        status: PaymentMethodStatus.APPROVED,
        isDefault: false,
        id: "fake-id",
        consumerID: consumer.props.id,
      });

      when(consumerRepo.getPaymentMethodForConsumer("fake-id", consumer.props.id)).thenResolve(paymentMethod);

      const response = await consumerService.getPaymentMethodProvider(consumer.props.id, "fake-id");
      expect(response).toBe(PaymentProvider.CHECKOUT);
    });

    it("throws NotFoundException when paymentMethodID does not exist for consumer", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: "fake+email@noba.com",
        displayEmail: "fake+email@noba.com",
      });

      when(consumerRepo.getPaymentMethodForConsumer("fake-id", consumer.props.id)).thenResolve(null);

      expect(async () => await consumerService.getPaymentMethodProvider(consumer.props.id, "fake-id")).rejects.toThrow(
        NotFoundException,
      );
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
      });

      const paymentMethod = PaymentMethod.createPaymentMethod({
        type: PaymentMethodType.CARD,
        paymentProvider: PaymentProvider.CHECKOUT,
        paymentToken: paymentToken,
        cardData: {
          id: "card-id",
          scheme: "VISA",
          first6Digits: "123456",
          last4Digits: "7890",
          authCode: "100000",
          authReason: "Approved",
          cardType: "Credit",
          paymentMethodID: "fake-method",
        },
        imageUri: "fake-uri",
        name: "Fake card",
        status: PaymentMethodStatus.APPROVED,
        isDefault: false,
        id: "fake-id",
        consumerID: consumer.props.id,
      });

      const updatedPaymentMethod: Partial<PaymentMethodProps> = {
        id: "fake-id",
        name: "New Fake Name",
      };

      when(consumerRepo.getPaymentMethodForConsumer("fake-id", consumer.props.id)).thenResolve(paymentMethod);
      when(consumerRepo.updatePaymentMethod(updatedPaymentMethod.id, deepEqual(updatedPaymentMethod))).thenResolve(
        PaymentMethod.createPaymentMethod({
          ...paymentMethod.props,
          name: "New Fake Name",
        }),
      );

      const response = await consumerService.updatePaymentMethod(consumer.props.id, updatedPaymentMethod);

      expect(response).toStrictEqual(
        PaymentMethod.createPaymentMethod({
          ...paymentMethod.props,
          name: "New Fake Name",
        }),
      );
    });

    it("should throw error when paymentMethodID does not exist for consumer", async () => {
      const email = "mock-user@noba.com";

      const paymentMethodID = "fake-token";
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
      });

      when(consumerRepo.getPaymentMethodForConsumer(paymentMethodID, consumer.props.id)).thenResolve(null);
      expect(
        async () =>
          await consumerService.updatePaymentMethod(consumer.props.id, { id: paymentMethodID, name: "Fake Name" }),
      ).rejects.toThrow(BadRequestException);
      expect(
        async () =>
          await consumerService.updatePaymentMethod(consumer.props.id, { id: paymentMethodID, name: "Fake Name" }),
      ).rejects.toThrow(`Payment method with id ${paymentMethodID} does not exist for consumer`);
    });
  });

  describe("confirmWalletUpdateOTP", () => {
    it("updates existing crypto wallet", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";
      const otp = 111111;

      when(sanctionedCryptoWalletService.isWalletSanctioned(walletAddress)).thenResolve(false);

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
      });
      const wallet = CryptoWallet.createCryptoWallet({
        id: "fake-wallet",
        name: "Test wallet",
        address: walletAddress,
        status: WalletStatus.PENDING,
        consumerID: consumer.props.id,
      });

      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + 5);

      when(otpService.checkIfOTPIsValidAndCleanup(email, IdentityType.CONSUMER, otp)).thenResolve(true);
      when(consumerRepo.getCryptoWalletForConsumer("fake-wallet", consumer.props.id)).thenResolve(wallet);
      when(sanctionedCryptoWalletService.isWalletSanctioned(walletAddress)).thenResolve(false);
      when(consumerRepo.updateCryptoWallet(anyString(), anything())).thenResolve();
      await consumerService.confirmWalletUpdateOTP(consumer, "fake-wallet", otp, NotificationMethod.EMAIL);

      verify(
        consumerRepo.updateCryptoWallet(
          "fake-wallet",
          deepEqual({
            ...wallet.props,
            status: WalletStatus.APPROVED,
          }),
        ),
      ).once();
    });

    it("throws BadRequestException when cryptoWallet is not found", async () => {
      const email = "mock-user@noba.com";
      const walletID = "fake-wallet-id";
      const otp = 111111;

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
      });

      when(consumerRepo.getCryptoWalletForConsumer(walletID, consumer.props.id)).thenResolve(null);

      expect(
        async () => await consumerService.confirmWalletUpdateOTP(consumer, walletID, otp, NotificationMethod.EMAIL),
      ).rejects.toThrow(BadRequestException);
      expect(
        async () => await consumerService.confirmWalletUpdateOTP(consumer, walletID, otp, NotificationMethod.EMAIL),
      ).rejects.toThrow("Crypto wallet does not exist for user");
    });

    it("throws Unauthorized exception when otp is wrong", async () => {
      const email = "mock-user@noba.com";
      const walletAddress = "fake-wallet-address";
      const otp = 111111;
      const wrongOtp = 234567;

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
      });

      const wallet = CryptoWallet.createCryptoWallet({
        id: "fake-wallet",
        name: "Test wallet",
        address: walletAddress,
        status: WalletStatus.PENDING,
        consumerID: consumer.props.id,
      });

      when(consumerRepo.getCryptoWalletForConsumer("fake-wallet", consumer.props.id)).thenResolve(wallet);

      when(otpService.checkIfOTPIsValidAndCleanup(consumer.props.email, IdentityType.CONSUMER, wrongOtp)).thenResolve(
        false,
      );

      expect(
        async () =>
          await consumerService.confirmWalletUpdateOTP(consumer, "fake-wallet", wrongOtp, NotificationMethod.EMAIL),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("getCryptoWallet", () => {
    it("gets crypto wallet for consumer given id", async () => {
      const email = "mock-user@noba.com";
      const walletID = "fake-wallet-id";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
      });

      const wallet = CryptoWallet.createCryptoWallet({
        id: walletID,
        address: "fake-address",
        status: WalletStatus.APPROVED,
        consumerID: consumer.props.id,
      });

      when(consumerRepo.getCryptoWalletForConsumer(walletID, consumer.props.id)).thenResolve(wallet);

      const response = await consumerService.getCryptoWallet(consumer, walletID);
      expect(response).toStrictEqual(wallet);
    });

    it("returns null when walletID does not exist for consumer", async () => {
      const email = "mock-user@noba.com";
      const walletID = "fake-wallet-id";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
      });
      when(consumerRepo.getCryptoWalletForConsumer(walletID, consumer.props.id)).thenResolve(null);

      const response = await consumerService.getCryptoWallet(consumer, walletID);
      expect(response).toStrictEqual(null);
    });
  });

  describe("removeCryptoWallet", () => {
    it("Sets wallet status to DELETED for user without touching other wallets", async () => {
      const email = "mock-user@noba.com";
      const walletID = "fake-wallet-id";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
      });

      const wallet = CryptoWallet.createCryptoWallet({
        id: walletID,
        address: "fake-address",
        status: WalletStatus.APPROVED,
        consumerID: consumer.props.id,
      });

      when(consumerRepo.getCryptoWalletForConsumer(walletID, consumer.props.id)).thenResolve(wallet);
      when(consumerRepo.updateCryptoWallet(anyString(), anything())).thenResolve();
      await consumerService.removeCryptoWallet(consumer, walletID);
      verify(
        consumerRepo.updateCryptoWallet(
          walletID,
          deepEqual({
            ...wallet.props,
            status: WalletStatus.DELETED,
          }),
        ),
      );
    });
  });

  describe("addOrUpdateCryptoWallet", () => {
    it("should add new crypto wallet", async () => {
      const email = "mock-user@noba.com";
      const walletID = "fake-wallet-id";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
      });

      const wallet = CryptoWallet.createCryptoWallet({
        id: walletID,
        address: "fake-address",
        status: WalletStatus.PENDING,
        consumerID: consumer.props.id,
      });

      when(otpService.saveOTP(consumer.props.email, IdentityType.CONSUMER, 111111)).thenResolve();
      when(consumerRepo.getCryptoWalletForConsumer(walletID, consumer.props.id)).thenResolve(null);
      when(consumerRepo.addCryptoWallet(anything())).thenResolve();
      await consumerService.addOrUpdateCryptoWallet(consumer, wallet, NotificationMethod.EMAIL);

      verify(consumerRepo.addCryptoWallet(deepEqual(wallet))).once();

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
          deepEqual({
            email: consumer.props.displayEmail,
            otp: "111111",
            walletAddress: wallet.props.address,
            firstName: consumer.props.firstName,
            nobaUserID: consumer.props.id,
          }),
        ),
      ).once();
    });

    it("should update the 'status' field of CryptoWallet if it's already there", async () => {
      const email = "mock-user@noba.com";
      const walletID = "fake-wallet-id";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
      });

      const wallet = CryptoWallet.createCryptoWallet({
        id: walletID,
        address: "fake-address",
        status: WalletStatus.PENDING,
        consumerID: consumer.props.id,
      });

      const updatedWallet = CryptoWallet.createCryptoWallet({
        ...wallet.props,
        status: WalletStatus.APPROVED,
      });
      when(consumerRepo.getCryptoWalletForConsumer(walletID, consumer.props.id)).thenResolve(wallet);
      when(consumerRepo.updateCryptoWallet(anyString(), anything())).thenResolve();
      await consumerService.addOrUpdateCryptoWallet(consumer, updatedWallet, NotificationMethod.EMAIL);

      verify(consumerRepo.updateCryptoWallet(walletID, deepEqual(updatedWallet.props))).once();
    });
  });

  describe("sendOtpToPhone", () => {
    it("should send otp to given phone number with given context", async () => {
      const phone = "+12434252";
      when(smsService.sendSMS(phone, anyString())).thenResolve();
      when(otpService.saveOTP(anyString(), anyString(), anyNumber())).thenResolve();
      await consumerService.sendOtpToPhone("123", phone);
      verify(smsService.sendSMS(phone, anyString())).once();
      verify(otpService.saveOTP(phone, IdentityType.CONSUMER, 111111)).once();
    });
  });

  describe("updateConsumerPhone", () => {
    it("incorrect and correct otp", async () => {
      const phone = "+12434252";
      const email = "a@noba.com";

      const otp = 111111;

      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
        firstName: "Mock",
        lastName: "Consumer",
        email: email,
        displayEmail: email,
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
      when(otpService.checkIfOTPIsValidAndCleanup(phone, IdentityType.CONSUMER, phoneUpdateRequest.otp)).thenResolve(
        false,
      );

      expect(async () => await consumerService.updateConsumerPhone(consumer, phoneUpdateRequest)).rejects.toThrow(
        BadRequestException,
      );

      phoneUpdateRequest.otp = otp; //correct otp
      when(consumerRepo.getConsumerByPhone(phone)).thenResolve(Result.fail(anything()));
      when(otpService.checkIfOTPIsValidAndCleanup(phone, IdentityType.CONSUMER, phoneUpdateRequest.otp)).thenResolve(
        true,
      );
      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anyString(), anything())).thenResolve(expectedUpdatedConsumer);

      const updateConsumerResponse = await consumerService.updateConsumerPhone(consumer, phoneUpdateRequest);

      expect(updateConsumerResponse).toEqual(expectedUpdatedConsumer);

      const [consumerID, updatedConsumer] = capture(consumerRepo.updateConsumer).last();
      expect(consumerID).toBe(consumer.props.id);
      expect(updatedConsumer.phone).toStrictEqual(expectedUpdatedConsumer.props.phone);
      expect(updatedConsumer.handle).toBeDefined();
    });

    it("doesn't update user if identifier already exists", async () => {
      const phone = "+12434252";
      const email = "a@noba.com";

      const otp = 111111;

      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
        firstName: "Mock",
        lastName: "Consumer",
        email: email,
        displayEmail: email,
      });

      const phoneUpdateRequest: UserPhoneUpdateRequest = {
        phone: phone,
        otp: otp, //correct otp
      };

      when(consumerRepo.getConsumerByPhone(phone)).thenResolve(Result.ok(anything()));
      when(otpService.checkIfOTPIsValidAndCleanup(phone, IdentityType.CONSUMER, phoneUpdateRequest.otp)).thenResolve(
        true,
      );

      expect(async () => await consumerService.updateConsumerPhone(consumer, phoneUpdateRequest)).rejects.toThrow(
        BadRequestException,
      );
      expect(async () => await consumerService.updateConsumerPhone(consumer, phoneUpdateRequest)).rejects.toThrow(
        "User already exists with this phone number",
      );
    });
  });

  describe("sendOtpToEmail", () => {
    it("should send otp to given email address with given context", async () => {
      const email = "Rosie@Noba.com";
      const firstName = "Rosie";
      const otp = 111111;

      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
        firstName: firstName,
        lastName: "Consumer",
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
      when(otpService.saveOTP(anyString(), anything(), anyNumber())).thenResolve();
      await consumerService.sendOtpToEmail(email, consumer);
      verify(otpService.saveOTP(email, consumerIdentityIdentifier, otp)).once();
    });
  });

  describe("findConsumersByContactInfo", () => {
    it("should find consumers by contact info", async () => {
      const consumer = Consumer.createConsumer({
        id: "mockConsumer",
        phone: "+15559993333",
        email: "mock@mock.com",
      });
      const consumer2 = Consumer.createConsumer({
        id: "mockConsumer2",
        phone: "+15559993333",
        email: "mock2@mock.com",
      });

      const contactListDTO = [
        { id: "linkid1", phoneNumbers: [], emails: [consumer.props.email] },
        { id: "linkid2", phoneNumbers: [], emails: [consumer2.props.email] },
      ];

      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactListDTO[0]))).thenResolve(Result.ok(consumer));
      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactListDTO[1]))).thenResolve(Result.ok(consumer2));

      const consumers = await consumerService.findConsumersByContactInfo(contactListDTO);
      expect(consumers).toEqual([consumer, consumer2]);
    });

    it("should return null array if no consumers found", async () => {
      const contactListDTO = [
        { id: "linkid1", phoneNumbers: [], emails: ["mock-unknown@mock.com"] },
        { id: "linkid2", phoneNumbers: [], emails: ["mock-unknown-2@mock.com"] },
      ];

      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactListDTO[0]))).thenResolve(Result.fail("Not found"));
      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactListDTO[1]))).thenResolve(Result.fail("Not found"));

      const consumers = await consumerService.findConsumersByContactInfo(contactListDTO);
      expect(consumers).toEqual([null, null]);
    });

    it("should normalize phone numbers", async () => {
      const consumer = Consumer.createConsumer({
        id: "mockConsumer",
        phone: "+15559993333",
      });
      const consumer2 = Consumer.createConsumer({
        id: "mockConsumer2",
        phone: "+15559993333",
      });

      const contactListDTO = [
        { id: "linkid1", phoneNumbers: [{ countryCode: "US", digits: "5553339999" }], emails: [] },
        { id: "linkid2", phoneNumbers: [{ countryCode: "CO", digits: "5553339999" }], emails: [] },
      ];

      const contactInfo = { id: "linkid1", phoneNumbers: ["+15553339999"], emails: [] };
      const contactInfo2 = { id: "linkid2", phoneNumbers: ["+575553339999"], emails: [] };
      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactInfo))).thenResolve(Result.ok(consumer));
      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactInfo2))).thenResolve(Result.ok(consumer2));

      await consumerService.findConsumersByContactInfo(contactListDTO);
    });

    it("should normalize emails", async () => {
      const consumer = Consumer.createConsumer({
        id: "mockConsumer",
        email: "MOCK@MOCK.COM",
      });

      const consumer2 = Consumer.createConsumer({
        id: "mockConsumer2",
        email: "MOCK2@MOCK.COM",
      });

      const contactListDTO = [
        { id: "linkid1", phoneNumbers: [], emails: [consumer.props.email] },
        { id: "linkid2", phoneNumbers: [], emails: [consumer2.props.email] },
      ];

      const contactInfo = { id: "linkid1", phoneNumbers: [], emails: ["mock@mock.com"] };
      const contactInfo2 = { id: "linkid2", phoneNumbers: [], emails: ["mock2@mock.com"] };
      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactInfo))).thenResolve(Result.ok(consumer));
      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactInfo2))).thenResolve(Result.ok(consumer2));

      await consumerService.findConsumersByContactInfo(contactListDTO);
    });
  });

  describe("updateConsumerEmail", () => {
    it("incorrect and correct otp", async () => {
      const phone = "+12434252";
      const email = "Rosie@Noba.com";

      const otp = 111111;

      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
        firstName: "Mock",
        lastName: "Consumer",
        phone: phone,
      });

      const emailUpdateRequest: UserEmailUpdateRequest = {
        email: email,
        otp: 123458, //incorrect otp
      };

      when(otpService.checkIfOTPIsValidAndCleanup(email, IdentityType.CONSUMER, emailUpdateRequest.otp)).thenResolve(
        false,
      );

      expect(async () => await consumerService.updateConsumerEmail(consumer, emailUpdateRequest)).rejects.toThrow(
        BadRequestException,
      );

      emailUpdateRequest.otp = otp; //correct otp

      when(consumerRepo.getConsumerByEmail(email.toLowerCase())).thenResolve(Result.fail(anything()));
      const expectedUpdatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        email: email.toLowerCase(),
        displayEmail: email,
      });
      when(otpService.checkIfOTPIsValidAndCleanup(email, IdentityType.CONSUMER, emailUpdateRequest.otp)).thenResolve(
        true,
      );
      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerRepo.updateConsumer(anyString(), anything())).thenResolve(expectedUpdatedConsumer);
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

      const [consumerID, updatedConsumer] = capture(consumerRepo.updateConsumer).last();
      expect(consumerID).toBe(consumer.props.id);
      expect(updatedConsumer.email).toStrictEqual(expectedUpdatedConsumer.props.email);
      expect(updatedConsumer.displayEmail).toStrictEqual(expectedUpdatedConsumer.props.displayEmail);
      expect(updatedConsumer.handle).toBeDefined();

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

      const otp = 111111;

      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
        firstName: "Mock",
        lastName: "Consumer",
        phone: phone,
      });

      const emailUpdateRequest: UserEmailUpdateRequest = {
        email: email,
        otp: otp, //correct otp
      };

      when(consumerRepo.getConsumerByEmail(email.toLowerCase())).thenResolve(Result.ok(anything()));
      when(otpService.checkIfOTPIsValidAndCleanup(email, IdentityType.CONSUMER, otp)).thenResolve(true);
      expect(async () => await consumerService.updateConsumerEmail(consumer, emailUpdateRequest)).rejects.toThrow(
        BadRequestException,
      );
      expect(async () => await consumerService.updateConsumerEmail(consumer, emailUpdateRequest)).rejects.toThrow(
        "User already exists with this email address",
      );
    });
  });

  describe("getConsumerIDByHandle", () => {
    it("should return consumer id if handle is valid", async () => {
      const handle = "rosie";
      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
        firstName: "Mock",
        lastName: "Consumer",
        email: "rosie@noba.com",
        handle: handle,
      });
      when(consumerRepo.getConsumerIDByHandle(handle)).thenResolve(consumer.props.id);
      const consumerId = await consumerService.findConsumerIDByHandle(handle);
      expect(consumerId).toEqual(consumer.props.id);
    });

    it("should return consumer id if handle is valid, stripping $", async () => {
      const handle = "rosie";
      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
        firstName: "Mock",
        lastName: "Consumer",
        email: "rosie@noba.com",
        handle: handle,
      });
      when(consumerRepo.getConsumerIDByHandle(handle)).thenResolve(consumer.props.id);
      const consumerId = await consumerService.findConsumerIDByHandle("$" + handle);
      expect(consumerId).toEqual(consumer.props.id);
    });

    it("should return null if handle doesn't exist", async () => {
      const handle = "rosie";
      when(consumerRepo.getConsumerIDByHandle(handle)).thenResolve(null);
      const consumerId = await consumerService.findConsumerIDByHandle("$" + handle);
      expect(consumerId).toEqual(null);
    });
  });

  describe("getConsumerIDByReferralCode", () => {
    it("should return consumer id if referral code is valid", async () => {
      const referralCode = "1234567890";
      const consumer = Consumer.createConsumer({
        id: "1234rwrwrwrwrwrwrwrw",
        firstName: "Mock",
        lastName: "Consumer",
        email: "rosie@noba.com",
        referralCode: referralCode,
      });
      when(consumerRepo.getConsumerIDByReferralCode(referralCode)).thenResolve(consumer.props.id);
      const consumerId = await consumerService.findConsumerIDByReferralCode(referralCode);
      expect(consumerId).toEqual(consumer.props.id);
    });

    it("should return null if referral code doesn't exist", async () => {
      const referralCode = "1234567890";
      when(consumerRepo.getConsumerIDByReferralCode(referralCode)).thenResolve(null);
      const consumerId = await consumerService.findConsumerIDByReferralCode(referralCode);
      expect(consumerId).toEqual(null);
    });
  });

  describe("cleanHandle", () => {
    it("should strip the $ off the handle", async () => {
      expect(consumerService.cleanHandle("$rosie")).toEqual("rosie");
    });

    it("should convert handle to lowercase", async () => {
      expect(consumerService.cleanHandle("$ROSIE")).toEqual("rosie");
    });

    it("should clean whitespace from end of handle", async () => {
      expect(consumerService.cleanHandle("$ROSIE   ")).toEqual("rosie");
    });

    it("should return null for a null handle", async () => {
      expect(consumerService.cleanHandle(null)).toBeNull();
    });

    it("should return undefined for an undefined handle", async () => {
      expect(consumerService.cleanHandle(undefined)).toBeUndefined();
    });
  });

  describe("isHandleAvailable", () => {
    it("should throw BadRequestException if 'handle' is less than 3 characters", async () => {
      expect(async () => await consumerService.isHandleAvailable("ab")).rejects.toThrow(BadRequestException);
      expect(async () => await consumerService.isHandleAvailable("ab")).rejects.toThrow(
        "'handle' should be between 3 and 22 charcters long.",
      );
    });

    it("should throw BadRequestException if 'handle' is greater than 22 characters", async () => {
      expect(async () => await consumerService.isHandleAvailable("abcdefghijklmnopqrstuva")).rejects.toThrow(
        BadRequestException,
      );
      expect(async () => await consumerService.isHandleAvailable("abcdefghijklmnopqrstuva")).rejects.toThrow(
        "'handle' should be between 3 and 22 charcters long.",
      );
    });

    it("should allow handle less than 22 characters and different cases", async () => {
      when(consumerRepo.isHandleTaken("aBCdEfghIjklMnopQRSTuv")).thenResolve(false);
      const response = await consumerService.isHandleAvailable("aBCdEfghIjklMnopQRSTuv");
      expect(response).toBeTruthy();
    });

    it("should throw BadRequestException if 'handle' starts with an underscore", async () => {
      expect(async () => await consumerService.isHandleAvailable("-abcd")).rejects.toThrow(BadRequestException);
      expect(async () => await consumerService.isHandleAvailable("-abcd")).rejects.toThrow(
        "'handle' can't start with an '-' and can only contain alphanumeric characters & '-'.",
      );
    });

    it("should allow handle if it starts with upper case letter or number", async () => {
      when(consumerRepo.isHandleTaken(anything())).thenResolve(false);

      const response1 = await consumerService.isHandleAvailable("My-Name");
      const response2 = await consumerService.isHandleAvailable("007-Bond");
      expect(response1).toBeTruthy();
      expect(response2).toBeTruthy();
    });

    it("should allow valid handle with spanish characters", async () => {
      when(consumerRepo.isHandleTaken(anything())).thenResolve(false);

      const response = await consumerService.isHandleAvailable("ñOBa-éícd");
      expect(response).toBeTruthy();
    });

    it("should throw BadRequestException if 'handle' has special characters other than underscore", async () => {
      expect(async () => await consumerService.isHandleAvailable("ab_")).rejects.toThrow(BadRequestException);
      expect(async () => await consumerService.isHandleAvailable("-abcd")).rejects.toThrow(
        "'handle' can't start with an '-' and can only contain alphanumeric characters & '-'.",
      );
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

  describe("getBase64EncodedQRCode", () => {
    it("should return base64 encoded QR code", async () => {
      const textToEncode = "https://noba.com/qr/CCCCCCCCCC";
      const base64EncodedQRCode = "data:image/png;base64,encodedQRCode";
      when(qrService.generateQRCode(textToEncode)).thenResolve(base64EncodedQRCode);

      const response = await consumerService.getBase64EncodedQRCode(textToEncode);
      expect(response).toEqual(base64EncodedQRCode);
    });
  });
});
