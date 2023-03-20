import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UserEmailUpdateRequest } from "test/api_client";
import { anyString, anything, deepEqual, instance, verify, when } from "ts-mockito";
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
  Gender,
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
import { QRCodeDTO } from "../dto/QRCodeDTO";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { Employer } from "../../../modules/employer/domain/Employer";
import { Employee, EmployeeAllocationCurrency } from "../../../modules/employee/domain/Employee";
import { uuid } from "uuidv4";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";

const getRandomEmployer = (): Employer => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    logoURI: "https://www.google.com",
    referralID: uuid(),
    leadDays: 1,
    payrollDates: ["2020-02-29", "2020-03-01", "2020-03-02"],
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  return employer;
};

const getRandomEmployee = (consumerID: string, employerID: string): Employee => {
  const employee: Employee = {
    id: uuid(),
    employerID: employerID,
    consumerID: consumerID,
    allocationAmount: Math.floor(Math.random() * 1000000),
    allocationCurrency: EmployeeAllocationCurrency.COP,
    createdTimestamp: new Date(),
    updatedTimestamp: new Date(),
  };

  return employee;
};

const getRandomConsumer = (): Consumer => {
  const consumer = Consumer.createConsumer({
    id: uuid(),
    email: `${uuid()}@noba.com`,
  });
  return consumer;
};

describe("ConsumerController", () => {
  let consumerController: ConsumerController;
  let consumerService: ConsumerService;
  let plaidClient: PlaidClient;
  let employeeService: EmployeeService;
  let consumerMapper: ConsumerMapper;

  jest.setTimeout(30000);

  beforeAll(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2020, 2, 1));
  });

  beforeEach(async () => {
    consumerService = getMockConsumerServiceWithDefaults();
    plaidClient = getMockPlaidClientWithDefaults();
    employeeService = getMockEmployeeServiceWithDefaults();

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
        {
          provide: EmployeeService,
          useFactory: () => instance(employeeService),
        },
        ConsumerMapper,
      ],
    }).compile();

    consumerController = app.get<ConsumerController>(ConsumerController);
    consumerMapper = app.get<ConsumerMapper>(ConsumerMapper);
  });

  afterAll(async () => {
    jest.useRealTimers();
  });

  describe("consumer controller tests", () => {
    it("should update consumer details", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        referralCode: "mock-referral-code",
      });

      const requestData: UpdateConsumerRequestDTO = {
        firstName: "New Mock",
        dateOfBirth: "1999-02-02",
        gender: Gender.MALE,
      };

      when(
        consumerService.updateConsumer(
          deepEqual({
            id: consumer.props.id,
            firstName: requestData.firstName,
            dateOfBirth: requestData.dateOfBirth,
            gender: requestData.gender,
          }),
        ),
      ).thenResolve(
        Consumer.createConsumer({
          ...consumer.props,
          firstName: requestData.firstName,
          dateOfBirth: requestData.dateOfBirth,
          gender: requestData.gender,
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
        referralCode: consumer.props.referralCode,
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
        referralCode: "mock-referral-code",
      });

      const requestData: UpdateConsumerRequestDTO = {
        referredByCode: "new-referred-by-code",
      };

      const referringID = "mock-referring-consumer-1";
      when(consumerService.findConsumerIDByReferralCode(requestData.referredByCode)).thenResolve(referringID);
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
        referralCode: consumer.props.referralCode,
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

  describe("subscribeToPushNotifications", () => {
    it("should subscribe to push notifications", async () => {
      const consumer = Consumer.createConsumer({
        email: "mock@noba.com",
      });

      when(consumerService.subscribeToPushNotifications(consumer.props.id, "push-token")).thenResolve();
      expect(consumerController.subscribeToPushNotifications("push-token", consumer)).resolves.toStrictEqual({});
    });
  });

  describe("unsubscribeFromPushNotifications", () => {
    it("should unsubscribe from push notifications", async () => {
      const consumer = Consumer.createConsumer({
        email: "mock@noba.com",
      });

      when(consumerService.unsubscribeFromPushNotifications(consumer.props.id, "push-token")).thenResolve();
      expect(consumerController.unsubscribeFromPushNotifications("push-token", consumer)).resolves.toStrictEqual({});
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

    // Skipping as we do not have paymentMethods or wallets
    it.skip("should return user status as PERMANENT_HOLD and walletStatus as NOT_SUBMITTED and filtered wallet list when one wallet is REJECTED", async () => {
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

    // Skipping as we do not have paymentMethods or wallets
    it.skip("should return user status as PENDING, paymentMethodStatus as PENDING and filtered payment method list when payment method is Flagged", async () => {
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

    // Skipping as we do not have paymentMethods or wallets
    it.skip("should return status as PERMANENT_HOLD when atleast one payment method is REJECTED", async () => {
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

    // Skipping as we do not have paymentMethods or wallets
    it.skip("should return user status as ACTION_REQUIRED, paymentMethodStatus as NOT_SUBMITTED and cryptoWalletStatus as NOT_SUBMITTED", async () => {
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

  describe("devicecontacts", () => {
    it("should return a list of contacts", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        email: "mock@mock.com",
        firstName: "mock",
        lastName: "mock",
        handle: "mock1",
      });
      const consumer2 = Consumer.createConsumer({
        id: "mock-consumer-2",
        email: "mock2@mock.com",
        handle: "mock2",
      });

      const contactListDTO = [
        { phoneNumbers: [], emails: [consumer.props.email] },
        { phoneNumbers: [], emails: [consumer2.props.email] },
      ];

      when(consumerService.findConsumersByContactInfo(contactListDTO)).thenResolve([consumer, consumer2]);
      expect(await consumerController.getConsumersByContact(contactListDTO, consumer)).toStrictEqual([
        {
          consumerID: consumer.props.id,
          handle: consumer.props.handle,
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
        },
        {
          consumerID: consumer2.props.id,
          handle: consumer2.props.handle,
          firstName: consumer2.props.firstName,
          lastName: consumer2.props.lastName,
        },
      ]);
    });

    it("should return null contact list if contact not found", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        email: "mock@mock.com",
        firstName: "mock",
        lastName: "mock",
        handle: "mock1",
      });

      const contactListDTO = [
        { phoneNumbers: [], emails: [consumer.props.email] },
        { phoneNumbers: [], emails: ["mock2-unknown@mock.com"] },
      ];

      when(consumerService.findConsumersByContactInfo(contactListDTO)).thenResolve([consumer, null]);
      expect(await consumerController.getConsumersByContact(contactListDTO, consumer)).toStrictEqual([
        {
          consumerID: consumer.props.id,
          handle: consumer.props.handle,
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
        },
        {
          consumerID: null,
          handle: null,
          firstName: null,
          lastName: null,
        },
      ]);
    });
  });

  describe("search", () => {
    it("should return a list of contacts", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        email: "mock@mock.com",
        firstName: "mock",
        lastName: "mock",
        handle: "mock1",
      });
      const consumer2 = Consumer.createConsumer({
        id: "mock-consumer-2",
        email: "mock@mock.com",
        firstName: "mock",
        lastName: "mock",
        handle: "mock2",
      });

      when(consumerService.findConsumersByPublicInfo("mock", 2)).thenResolve([consumer, consumer2]);
      expect(await consumerController.searchConsumers("mock", { limit: 2 }, consumer)).toStrictEqual([
        {
          consumerID: consumer.props.id,
          handle: consumer.props.handle,
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
        },
        {
          consumerID: consumer2.props.id,
          handle: consumer2.props.handle,
          firstName: consumer2.props.firstName,
          lastName: consumer2.props.lastName,
        },
      ]);
    });

    it("should set limit default to 10", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        email: "mock@mock.com",
        firstName: "mock",
        lastName: "mock",
        handle: "mock1",
      });
      const consumer2 = Consumer.createConsumer({
        id: "mock-consumer-2",
        email: "mock@mock.com",
        firstName: "mock",
        lastName: "mock",
        handle: "mock2",
      });

      when(consumerService.findConsumersByPublicInfo("mock", 10)).thenResolve([consumer, consumer2]);
      expect(await consumerController.searchConsumers("mock", { limit: undefined }, consumer)).toStrictEqual([
        {
          consumerID: consumer.props.id,
          handle: consumer.props.handle,
          firstName: consumer.props.firstName,
          lastName: consumer.props.lastName,
        },
        {
          consumerID: consumer2.props.id,
          handle: consumer2.props.handle,
          firstName: consumer2.props.firstName,
          lastName: consumer2.props.lastName,
        },
      ]);
    });
  });

  describe("getQRCode", () => {
    it("should return a QR code", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        referralCode: "mock-referral-code",
      });
      const url = "https://noba.com";

      when(consumerService.getBase64EncodedQRCode(url)).thenResolve("mock-qr-code");
      const response: QRCodeDTO = await consumerController.getQRCode(consumer, url);

      expect(response).toStrictEqual({ base64OfImage: "mock-qr-code" });
    });
  });

  describe("registerWithAnEmployer", () => {
    it("should forward the call to consumerService", async () => {
      const consumer = getRandomConsumer();
      when(consumerService.registerWithAnEmployer("employerID", consumer.props.id, 1478)).thenResolve();

      await consumerController.registerWithAnEmployer(
        {
          employerID: "employerID",
          allocationAmountInPesos: 1478,
        },
        consumer,
      );
    });
  });

  describe("listLinkedEmployers", () => {
    it("should return a list of linked employers", async () => {
      const consumer = getRandomConsumer();

      const defaultEmployer = getRandomEmployer();
      const defaultPayrollDates = defaultEmployer.payrollDates;

      const employer1 = getRandomEmployer(); // before lead days
      employer1.payrollDates.push("2020-03-04");

      const employer2 = getRandomEmployer(); // after lead days
      employer2.leadDays = 0;

      const employer3 = getRandomEmployer(); // asc sort
      employer3.payrollDates.push("2020-02-23");
      const sortedEmployer3PayrollDates = ["2020-02-23"].concat(defaultPayrollDates);

      const employee1 = getRandomEmployee(consumer.props.id, employer1.id);
      employee1.employer = employer1;
      const employee2 = getRandomEmployee(consumer.props.id, employer2.id);
      employee2.employer = employer2;
      const employee3 = getRandomEmployee(consumer.props.id, employer3.id);
      employee3.employer = employer3;

      when(consumerService.listLinkedEmployers(consumer.props.id)).thenResolve([employee1, employee2, employee3]);
      when(employeeService.getEmployeeByID(employee1.id, deepEqual(true))).thenResolve(employee1);
      when(employeeService.getEmployeeByID(employee2.id, deepEqual(true))).thenResolve(employee2);
      when(employeeService.getEmployeeByID(employee3.id, deepEqual(true))).thenResolve(employee3);

      const response = await consumerController.listLinkedEmployers(consumer);
      expect(response).toHaveLength(3);
      expect(response).toEqual(
        expect.arrayContaining([
          {
            employerID: employer1.id,
            employerName: employer1.name,
            employerLogoURI: employer1.logoURI,
            allocationAmountInPesos: employee1.allocationAmount,
            employerReferralID: employer1.referralID,
            leadDays: employer1.leadDays,
            payrollDates: employer1.payrollDates,
            nextPayrollDate: employer1.payrollDates[3],
          },
          {
            employerID: employer2.id,
            employerName: employer2.name,
            employerLogoURI: employer2.logoURI,
            allocationAmountInPesos: employee2.allocationAmount,
            employerReferralID: employer2.referralID,
            leadDays: employer2.leadDays,
            payrollDates: employer2.payrollDates,
            nextPayrollDate: employer1.payrollDates[2],
          },
          {
            employerID: employer3.id,
            employerName: employer3.name,
            employerLogoURI: employer3.logoURI,
            allocationAmountInPesos: employee3.allocationAmount,
            employerReferralID: employer3.referralID,
            leadDays: employer3.leadDays,
            payrollDates: sortedEmployer3PayrollDates,
          },
        ]),
      );
    });
  });

  describe("updateAllocationAmountForAnEmployer", () => {
    it("should forward the call to consumerService", async () => {
      const consumer = getRandomConsumer();
      const employer1 = getRandomEmployer(); // before lead days
      employer1.payrollDates.push("2020-03-04");
      const employee1 = getRandomEmployee(consumer.props.id, employer1.id);
      employee1.employer = employer1;
      when(employeeService.getEmployeeByID(employee1.id, deepEqual(true))).thenResolve(employee1);
      when(consumerService.updateEmployerAllocationAmount(employer1.id, consumer.props.id, 1478)).thenResolve(
        employee1,
      );

      const updatedEmployee = await consumerController.updateAllocationAmountForAnEmployer(consumer, {
        employerID: employer1.id,
        allocationAmountInPesos: 1478,
      });

      expect(updatedEmployee).toEqual({
        employerID: employer1.id,
        employerName: employer1.name,
        employerLogoURI: employer1.logoURI,
        allocationAmountInPesos: employee1.allocationAmount,
        employerReferralID: employer1.referralID,
        leadDays: employer1.leadDays,
        payrollDates: employer1.payrollDates,
        nextPayrollDate: employer1.payrollDates[3],
      });
    });
  });

  describe("postEmployerRequestEmail", () => {
    it("should forwards the call to consumerService", async () => {
      const consumer = getRandomConsumer();
      consumer.props.firstName = "Rosie";
      consumer.props.lastName = "Noba";
      when(
        consumerService.sendEmployerRequestEmail("rosie@noba.com", consumer.props.locale, "Rosie", "Noba"),
      ).thenResolve();

      await consumerController.postEmployerRequestEmail({ email: "rosie@noba.com" }, consumer);
    });
  });
});
