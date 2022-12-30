import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UserEmailUpdateRequest } from "test/api_client";
import { deepEqual, instance, verify, when } from "ts-mockito";
import { PhoneVerificationOtpRequest } from "../../../../test/api_client/models/PhoneVerificationOtpRequest";
import { UserPhoneUpdateRequest } from "../../../../test/api_client/models/UserPhoneUpdateRequest";
import { Result } from "../../../core/logic/Result";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { getMockPlaidClientWithDefaults } from "../../../modules/psp/mocks/mock.plaid.client";
import { PlaidClient } from "../../../modules/psp/plaid.client";
import { ConsumerController } from "../consumer.controller";
import { ConsumerService } from "../consumer.service";
import { Consumer } from "../domain/Consumer";
import {
  AggregatedPaymentMethodState,
  AggregatedWalletState,
  DocumentVerificationErrorReason,
  DocumentVerificationState,
  KycVerificationState,
  UserState,
} from "../domain/ExternalStates";
import { EmailVerificationOtpRequest } from "../dto/EmailVerificationDTO";
import { UpdateConsumerRequestDTO } from "../dto/UpdateConsumerRequestDTO";
import { ConsumerMapper } from "../mappers/ConsumerMapper";
import { getMockConsumerServiceWithDefaults } from "../mocks/mock.consumer.service";
import {
  PaymentMethodType,
  DocumentVerificationStatus,
  KYCStatus,
  PaymentMethodStatus,
  WalletStatus,
  PaymentProvider,
  KYCProvider,
} from "@prisma/client";
import { CryptoWallet } from "../domain/CryptoWallet";
import { PaymentMethod } from "../domain/PaymentMethod";

describe("ConsumerController", () => {
  let consumerController: ConsumerController;
  let consumerService: ConsumerService;
  let plaidClient: PlaidClient;

  const consumerMapper = new ConsumerMapper();

  jest.setTimeout(30000);

  beforeEach(async () => {
    consumerService = getMockConsumerServiceWithDefaults();
    plaidClient = getMockPlaidClientWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [ConsumerController],
      providers: [
        {
          provide: ConsumerService,
          useFactory: () => instance(consumerService),
        },
        {
          provide: PlaidClient,
          useFactory: () => instance(plaidClient),
        },
      ],
    }).compile();

    consumerController = app.get<ConsumerController>(ConsumerController);
  });

  describe("consumer controller tests", () => {
    it("should update consumer details", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      const requestData: UpdateConsumerRequestDTO = {
        firstName: "New Mock",
        dateOfBirth: "1999-02-02",
      };

      when(
        consumerService.updateConsumer(
          deepEqual({
            id: consumer.props.id,
            firstName: requestData.firstName,
            dateOfBirth: requestData.dateOfBirth,
          }),
        ),
      ).thenResolve(
        Consumer.createConsumer({
          ...consumer.props,
          firstName: requestData.firstName,
          dateOfBirth: requestData.dateOfBirth,
        }),
      );
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve([]);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([]);

      const result = await consumerController.updateConsumer(consumer, requestData);

      expect(result).toEqual({
        id: consumer.props.id,
        firstName: requestData.firstName,
        lastName: consumer.props.lastName,
        email: consumer.props.email,
        status: "ActionRequired",
        kycVerificationData: {
          kycVerificationStatus: "NotSubmitted",
          updatedTimestamp: 0,
        },
        documentVerificationData: {
          documentVerificationStatus: "NotRequired",
          documentVerificationErrorReason: null,
          updatedTimestamp: 0,
        },
        dateOfBirth: requestData.dateOfBirth,
        address: null,
        cryptoWallets: [],
        paymentMethods: [],
        paymentMethodStatus: "NotSubmitted",
        walletStatus: "NotSubmitted",
      });
    });

    it("should update consumer referred by", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      const requestData: UpdateConsumerRequestDTO = {
        referredByHandle: "new-referred-by-handle",
      };

      const referringID = "mock-referring-consumer-1";
      when(consumerService.findConsumerIDByHandle(requestData.referredByHandle)).thenResolve(referringID);
      when(
        consumerService.updateConsumer(
          deepEqual({
            id: consumer.props.id,
            referredByID: referringID,
          }),
        ),
      ).thenResolve(
        Consumer.createConsumer({
          ...consumer.props,
          referredByID: referringID,
        }),
      );
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve([]);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([]);

      const result = await consumerController.updateConsumer(consumer, requestData);

      expect(result).toEqual({
        id: consumer.props.id,
        firstName: consumer.props.firstName,
        lastName: consumer.props.lastName,
        email: consumer.props.email,
        status: "ActionRequired",
        kycVerificationData: {
          kycVerificationStatus: "NotSubmitted",
          updatedTimestamp: 0,
        },
        documentVerificationData: {
          documentVerificationStatus: "NotRequired",
          documentVerificationErrorReason: null,
          updatedTimestamp: 0,
        },
        dateOfBirth: consumer.props.dateOfBirth,
        address: null,
        cryptoWallets: [],
        paymentMethods: [],
        paymentMethodStatus: "NotSubmitted",
        walletStatus: "NotSubmitted",
      });
    });
  });

  describe("phoneUpdateOtpRequest", () => {
    it("should send a phone update OTP request", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      const phone = "+1234567890";

      const phoneUpdateOtpRequest: PhoneVerificationOtpRequest = {
        phone: phone,
      };

      when(consumerService.findConsumerByEmailOrPhone(phone)).thenResolve(Result.fail("Non-existent user"));
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.sendOtpToPhone(consumer.props.id, phone)).thenResolve();

      await consumerController.requestOtpToUpdatePhone(consumer, phoneUpdateOtpRequest);

      verify(consumerService.sendOtpToPhone(consumer.props.id, phone)).called();
    });

    it("should reject the request if phone already exists for this or another account", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      const phone = "+1234567890";

      const phoneUpdateOtpRequest: PhoneVerificationOtpRequest = {
        phone: phone,
      };
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve([]);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([]);
      when(consumerService.findConsumerByEmailOrPhone(phone)).thenResolve(
        Result.ok(Consumer.createConsumer({ phone: phone })),
      );
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.sendOtpToPhone(consumer.props.id, phone)).thenResolve();
      expect(
        async () => await consumerController.requestOtpToUpdatePhone(consumer, phoneUpdateOtpRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("phone", () => {
    it("should add or update phone", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      const phone = "+1234567890";

      const phoneUpdateRequest: UserPhoneUpdateRequest = {
        phone: phone,
        otp: 123456,
      };

      const expectedUpdatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        phone: phone,
      });
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve([]);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([]);
      when(consumerService.findConsumerByEmailOrPhone(phone)).thenResolve(Result.fail("Non-existent user"));
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.updateConsumerPhone(consumer, phoneUpdateRequest)).thenResolve(expectedUpdatedConsumer);

      const updatedConsumer = await consumerController.updatePhone(consumer, phoneUpdateRequest);

      verify(consumerService.updateConsumerPhone(consumer, phoneUpdateRequest)).called();

      expect(updatedConsumer).toEqual(consumerMapper.toDTO(expectedUpdatedConsumer, [], []));
    });

    it("should reject the request if phone already exists for this or another account", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      const phone = "+1234567890";

      const phoneUpdateRequest: UserPhoneUpdateRequest = {
        phone: phone,
        otp: 123456,
      };
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve([]);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([]);
      when(consumerService.updateConsumerPhone(consumer, phoneUpdateRequest)).thenThrow(new BadRequestException());

      expect(async () => await consumerController.updatePhone(consumer, phoneUpdateRequest)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("emailUpdateOtpRequest", () => {
    it("should send an email update OTP request", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        phone: "+123456789",
      });

      const email = "rosie@noba.com";

      const emailUpdateOtpRequest: EmailVerificationOtpRequest = {
        email: email,
      };

      const apiKey = "1234567890";
      when(consumerService.findConsumerByEmailOrPhone(email)).thenResolve(Result.fail("Non-existent user"));
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.sendOtpToEmail(email, consumer)).thenResolve();

      await consumerController.requestOtpToUpdateEmail(consumer, emailUpdateOtpRequest);

      verify(consumerService.sendOtpToEmail(email, consumer)).called();
    });

    it("should reject the request if email already exists for this or another account", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        phone: "+123456789",
      });

      const email = "rosie@noba.com";

      const emailUpdateOtpRequest: EmailVerificationOtpRequest = {
        email: email,
      };

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.sendOtpToEmail(email, consumer)).thenResolve();
      when(consumerService.findConsumerByEmailOrPhone(email)).thenResolve(
        Result.ok(Consumer.createConsumer({ email: email })),
      );
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve([]);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([]);

      expect(
        async () => await consumerController.requestOtpToUpdateEmail(consumer, emailUpdateOtpRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("email", () => {
    it("should add or update email", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        phone: "+123456789",
      });

      const email = "Rosie@Noba.com";

      const emailUpdateRequest: UserEmailUpdateRequest = {
        email: email,
        otp: 123456,
      };

      const expectedUpdatedConsumer = Consumer.createConsumer({
        ...consumer.props,
        email: email.toLowerCase(),
        displayEmail: email,
      });

      when(consumerService.findConsumerByEmailOrPhone(email)).thenResolve(Result.fail("Non-existent user"));
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.updateConsumerEmail(consumer, emailUpdateRequest)).thenResolve(expectedUpdatedConsumer);
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve([]);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([]);
      const updatedConsumer = await consumerController.updateEmail(consumer, emailUpdateRequest);

      verify(consumerService.updateConsumerEmail(consumer, emailUpdateRequest)).called();

      expect(updatedConsumer).toEqual(consumerMapper.toDTO(expectedUpdatedConsumer, [], []));
    });

    it("should reject the request if email already exists for this or another account", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        phone: "+123456789",
      });

      const email = "Rosie@Noba.com";

      const emailUpdateRequest: UserEmailUpdateRequest = {
        email: email,
        otp: 123456,
      };
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.updateConsumerEmail(consumer, emailUpdateRequest)).thenThrow(new BadRequestException());
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve([]);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([]);

      expect(async () => await consumerController.updateEmail(consumer, emailUpdateRequest)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("external state mapping tests", () => {
    it("should return status as APPROVED, walletStatus and paymentMethodStatus as APPROVED and all payment methods and wallets when all are Approved", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      const cryptoWallet = CryptoWallet.createCryptoWallet({
        address: "wallet-1",
        status: WalletStatus.APPROVED,
        consumerID: consumer.props.id,
      });

      const paymentMethod = PaymentMethod.createPaymentMethod({
        type: PaymentMethodType.CARD,
        paymentProvider: PaymentProvider.CHECKOUT,
        paymentToken: "faketoken1234",
        cardData: {} as any,
        imageUri: "testimage",
        status: PaymentMethodStatus.APPROVED,
        isDefault: false,
        consumerID: consumer.props.id,
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve([cryptoWallet]);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([paymentMethod]);
      const response = await consumerController.getConsumer(consumer);

      expect(response.status).toBe(UserState.APPROVED);
      expect(response.kycVerificationData.kycVerificationStatus).toBe(KycVerificationState.APPROVED);
      expect(response.documentVerificationData.documentVerificationStatus).toBe(DocumentVerificationState.VERIFIED);
      expect(response.walletStatus).toBe(AggregatedWalletState.APPROVED);
      expect(response.paymentMethodStatus).toBe(AggregatedPaymentMethodState.APPROVED);
    });

    it("should return wallet status as APPROVED when some wallets are in Pending state and atleast one wallet is in APPROVED state", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      const paymentMethods = [
        PaymentMethod.createPaymentMethod({
          type: PaymentMethodType.CARD,
          paymentProvider: PaymentProvider.CHECKOUT,
          paymentToken: "faketoken1234",
          cardData: {} as any,
          imageUri: "testimage",
          status: PaymentMethodStatus.APPROVED,
          isDefault: false,
          consumerID: consumer.props.id,
        }),
      ];

      const wallets = [
        CryptoWallet.createCryptoWallet({
          address: "wallet-1",
          status: WalletStatus.APPROVED,
          consumerID: consumer.props.id,
        }),
        CryptoWallet.createCryptoWallet({
          address: "wallet-2",
          status: WalletStatus.PENDING,
          consumerID: consumer.props.id,
        }),
      ];

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve(wallets);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve(paymentMethods);

      const response = await consumerController.getConsumer(consumer);

      expect(response.status).toBe(UserState.APPROVED);
      expect(response.kycVerificationData.kycVerificationStatus).toBe(KycVerificationState.APPROVED);
      expect(response.documentVerificationData.documentVerificationStatus).toBe(DocumentVerificationState.VERIFIED);
      expect(response.walletStatus).toBe(AggregatedWalletState.APPROVED);
      expect(response.paymentMethodStatus).toBe(AggregatedPaymentMethodState.APPROVED);
    });

    it("should return user status as PERMANENT_HOLD and walletStatus as NOT_SUBMITTED and filtered wallet list when one wallet is REJECTED", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      const paymentMethods = [
        PaymentMethod.createPaymentMethod({
          type: PaymentMethodType.CARD,
          paymentProvider: PaymentProvider.CHECKOUT,
          paymentToken: "faketoken1234",
          cardData: {} as any,
          imageUri: "testimage",
          status: PaymentMethodStatus.APPROVED,
          isDefault: false,
          consumerID: consumer.props.id,
        }),
      ];

      const wallets = [
        CryptoWallet.createCryptoWallet({
          address: "wallet-1",
          status: WalletStatus.APPROVED,
          consumerID: consumer.props.id,
        }),
        CryptoWallet.createCryptoWallet({
          address: "wallet-2",
          status: WalletStatus.REJECTED,
          consumerID: consumer.props.id,
        }),
      ];

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve(wallets);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve(paymentMethods);

      const response = await consumerController.getConsumer(consumer);

      expect(response.status).toBe(UserState.PERMANENT_HOLD);
      expect(response.walletStatus).toBe(AggregatedWalletState.NOT_SUBMITTED);
      expect(response.paymentMethodStatus).toBe(AggregatedPaymentMethodState.APPROVED);
      expect(response.cryptoWallets.length).toBe(1);
    });

    it("should return user status as PENDING, paymentMethodStatus as PENDING and filtered payment method list when payment method is Flagged", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      const paymentMethods = [
        PaymentMethod.createPaymentMethod({
          type: PaymentMethodType.CARD,
          paymentProvider: PaymentProvider.CHECKOUT,
          paymentToken: "faketoken1234",
          cardData: {} as any,
          imageUri: "testimage",
          status: PaymentMethodStatus.FLAGGED,
          isDefault: false,
          consumerID: consumer.props.id,
        }),
      ];

      const wallets = [
        CryptoWallet.createCryptoWallet({
          address: "wallet-1",
          status: WalletStatus.APPROVED,
          consumerID: consumer.props.id,
        }),
      ];

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve(wallets);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve(paymentMethods);

      const response = await consumerController.getConsumer(consumer);
      expect(response.status).toBe(UserState.PENDING);
      expect(response.walletStatus).toBe(AggregatedWalletState.APPROVED);
      expect(response.paymentMethodStatus).toBe(AggregatedPaymentMethodState.PENDING);
      expect(response.paymentMethods.length).toBe(0);
      expect(response.kycVerificationData.kycVerificationStatus).toBe(KycVerificationState.APPROVED);
      expect(response.documentVerificationData.documentVerificationStatus).toBe(DocumentVerificationState.NOT_REQUIRED);
    });

    it("tests REJECTED kycVerificationStatus, NOT_SUBMITTED documentVerificationStatus, ACH payment method with APPROVED state", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        verificationData: {
          kycCheckStatus: KYCStatus.REJECTED,
          documentVerificationStatus: DocumentVerificationStatus.REQUIRED,
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      const paymentMethods = [
        PaymentMethod.createPaymentMethod({
          type: PaymentMethodType.ACH,
          paymentProvider: PaymentProvider.CHECKOUT,
          paymentToken: "faketoken1234",
          achData: {} as any,
          imageUri: "testimage",
          status: PaymentMethodStatus.APPROVED,
          isDefault: false,
          consumerID: consumer.props.id,
        }),
      ];

      const wallets = [
        CryptoWallet.createCryptoWallet({
          address: "wallet-1",
          status: WalletStatus.APPROVED,
          consumerID: consumer.props.id,
        }),
      ];

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve(wallets);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve(paymentMethods);

      const response = await consumerController.getConsumer(consumer);

      expect(response.status).toBe(UserState.PERMANENT_HOLD);
      expect(response.walletStatus).toBe(AggregatedWalletState.APPROVED);
      expect(response.paymentMethodStatus).toBe(AggregatedPaymentMethodState.APPROVED);
      expect(response.paymentMethods.length).toBe(1);
      expect(response.kycVerificationData.kycVerificationStatus).toBe(KycVerificationState.REJECTED);
      expect(response.documentVerificationData.documentVerificationStatus).toBe(
        DocumentVerificationState.NOT_SUBMITTED,
      );
    });

    it("should return ActionRequired with proper error reason for document verification status when verification fails for BAD_QUALITY", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY,
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve([]);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([]);

      const response = await consumerController.getConsumer(consumer);

      expect(response.status).toBe(UserState.ACTION_REQUIRED);
      expect(response.documentVerificationData.documentVerificationStatus).toBe(
        DocumentVerificationState.ACTION_REQUIRED,
      );
      expect(response.documentVerificationData.documentVerificationErrorReason).toBe(
        DocumentVerificationErrorReason.POOR_QUALITY,
      );
    });

    it("should return status as TEMPORARY_HOLD when user has isDisabled set to true", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: true,
        isLocked: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY,
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve([]);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([]);

      const response = await consumerController.getConsumer(consumer);

      expect(response.status).toBe(UserState.TEMPORARY_HOLD);
    });

    it("should return status as PERMANENT_HOLD when atleast one payment method is REJECTED", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY,
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      const paymentMethods = [
        PaymentMethod.createPaymentMethod({
          type: PaymentMethodType.ACH,
          paymentProvider: PaymentProvider.CHECKOUT,
          paymentToken: "faketoken1234",
          achData: {} as any,
          imageUri: "testimage",
          status: PaymentMethodStatus.REJECTED,
          isDefault: false,
          consumerID: consumer.props.id,
        }),
      ];

      const wallets = [
        CryptoWallet.createCryptoWallet({
          address: "wallet-1",
          status: WalletStatus.APPROVED,
          consumerID: consumer.props.id,
        }),
      ];

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve(wallets);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve(paymentMethods);

      const response = await consumerController.getConsumer(consumer);
      expect(response.status).toBe(UserState.PERMANENT_HOLD);
    });

    it("should return user status as ACTION_REQUIRED, paymentMethodStatus as NOT_SUBMITTED and cryptoWalletStatus as NOT_SUBMITTED", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      const wallets = [
        CryptoWallet.createCryptoWallet({
          address: "wallet-1",
          status: WalletStatus.DELETED,
          consumerID: consumer.props.id,
        }),
      ];

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.getAllConsumerWallets(consumer.props.id)).thenResolve(wallets);
      when(consumerService.getAllPaymentMethodsForConsumer(consumer.props.id)).thenResolve([]);

      const response = await consumerController.getConsumer(consumer);

      expect(response.status).toBe(UserState.ACTION_REQUIRED);
      expect(response.walletStatus).toBe(AggregatedWalletState.NOT_SUBMITTED);
      expect(response.paymentMethodStatus).toBe(AggregatedPaymentMethodState.NOT_SUBMITTED);
      expect(response.paymentMethods).toHaveLength(0);
      expect(response.cryptoWallets).toHaveLength(0);
      expect(response.kycVerificationData.kycVerificationStatus).toBe(KycVerificationState.APPROVED);
      expect(response.documentVerificationData.documentVerificationStatus).toBe(DocumentVerificationState.NOT_REQUIRED);
    });
  });
});
