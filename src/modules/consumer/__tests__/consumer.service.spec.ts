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
import {
  DocumentVerificationStatus,
  KYCProvider,
  KYCStatus,
  PaymentMethodStatus,
  PaymentMethodType,
  PaymentProvider,
  WalletStatus,
} from "@prisma/client";
import { QRService } from "../../../modules/common/qrcode.service";
import { getMockQRServiceWithDefaults } from "../../../modules/common/mocks/mock.qr.service";
import { ServiceErrorCode, ServiceException } from "../../../core/exception/service.exception";
import { EmployeeService } from "../../../modules/employee/employee.service";
import { EmployerService } from "../../../modules/employer/employer.service";
import { getMockEmployeeServiceWithDefaults } from "../../../modules/employee/mocks/mock.employee.service";
import { getMockEmployerServiceWithDefaults } from "../../../modules/employer/mocks/mock.employer.service";
import { Employer } from "../../../modules/employer/domain/Employer";
import { Employee, EmployeeAllocationCurrency } from "../../../modules/employee/domain/Employee";
import { uuid } from "uuidv4";
import { BubbleService } from "../../bubble/bubble.service";
import { getMockBubbleServiceWithDefaults } from "../../../modules/bubble/mocks/mock.bubble.service";
import { ConsumerMapper } from "../mappers/ConsumerMapper";
import { getMockConsumerMapperWithDefaults } from "../mocks/mock.consumer.mapper";

const getRandomEmployer = (): Employer => {
  const employer: Employer = {
    id: uuid(),
    name: "Test Employer",
    bubbleID: uuid(),
    logoURI: "https://www.google.com",
    referralID: uuid(),
    leadDays: 1,
    payrollDates: ["2020-03-01"],
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

describe("ConsumerService", () => {
  let consumerService: ConsumerService;
  let consumerRepo: IConsumerRepo;
  let consumerMapper: ConsumerMapper;
  let notificationService: NotificationService;
  let otpService: OTPService;
  let paymentService: PaymentService;
  let sanctionedCryptoWalletService: SanctionedCryptoWalletService;
  let plaidClient: PlaidClient;
  let circleClient: CircleClient;
  let qrService: QRService;
  let employeeService: EmployeeService;
  let employerService: EmployerService;
  let bubbleService: BubbleService;

  jest.setTimeout(30000);

  beforeEach(async () => {
    consumerRepo = getMockConsumerRepoWithDefaults();
    consumerMapper = getMockConsumerMapperWithDefaults();
    notificationService = getMockNotificationServiceWithDefaults();
    otpService = getMockOTPServiceWithDefaults();
    paymentService = getMockPaymentServiceWithDefaults();
    plaidClient = getMockPlaidClientWithDefaults();
    sanctionedCryptoWalletService = getMockSanctionedCryptoWalletServiceWithDefaults();
    circleClient = getMockCircleClientWithDefaults();
    qrService = getMockQRServiceWithDefaults();
    employeeService = getMockEmployeeServiceWithDefaults();
    employerService = getMockEmployerServiceWithDefaults();
    bubbleService = getMockBubbleServiceWithDefaults();

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
          provide: ConsumerMapper,
          useFactory: () => instance(consumerMapper),
        },
        {
          provide: NotificationService,
          useFactory: () => instance(notificationService),
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
        {
          provide: EmployeeService,
          useFactory: () => instance(employeeService),
        },
        {
          provide: EmployerService,
          useFactory: () => instance(employerService),
        },
        {
          provide: BubbleService,
          useFactory: () => instance(bubbleService),
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

  describe("getConsumer", () => {
    it("should find the consumer", async () => {
      const email = "mock-user@noba.com";

      const consumerID = "mock-consumer-1";
      const consumer = Consumer.createConsumer({
        id: consumerID,
        email: email,
      });

      when(consumerRepo.getConsumer(consumerID)).thenResolve(consumer);
      const response = await consumerService.getConsumer(consumerID);
      expect(response).toStrictEqual(consumer);
    });

    it("should not find the consumer if it doesn't exist", async () => {
      when(consumerRepo.getConsumer("missing-consumer")).thenThrow(new NotFoundException());

      expect(async () => {
        await consumerService.getConsumer("missing-consumer");
      }).rejects.toThrow(NotFoundException);
    });
  });

  describe("getActiveConsumer", () => {
    const getKYCdConsumer = (id: string, email: string, handle: string): Consumer => {
      return Consumer.createConsumer({
        id: id,
        email: email,
        handle: handle,
        isLocked: false,
        isDisabled: false,
        verificationData: {
          kycCheckStatus: KYCStatus.APPROVED,
          kycVerificationTimestamp: new Date(),
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          documentVerificationTimestamp: new Date(),
          isSuspectedFraud: false,
          provider: KYCProvider.SARDINE,
        },
      });
    };

    it("should find the consumer by handle", async () => {
      const email = "mock-user@noba.com";
      const consumerID = "mock-consumer-1";
      const handle = "mock-handle";
      const requestHandle = "$mock-handle";
      const consumer = getKYCdConsumer(consumerID, email, handle);

      when(consumerRepo.getConsumerByHandle(handle)).thenResolve(consumer);
      const response = await consumerService.getActiveConsumer(requestHandle);
      expect(response).toStrictEqual(consumer);
    });

    it("should not find the consumer by handle if it doesn't exist", async () => {
      when(consumerRepo.getConsumerByHandle("$missing-handle")).thenResolve(null);

      expect(async () => {
        await consumerService.getActiveConsumer("$missing-handle");
      }).rejects.toThrow(ServiceException);
    });

    it("should find the consumer by ID", async () => {
      const email = "mock-user@noba.com";
      const consumerID = "mock-consumer-1";
      const consumer = getKYCdConsumer(consumerID, email, null);

      when(consumerRepo.getConsumer(consumerID)).thenResolve(consumer);
      const response = await consumerService.getActiveConsumer(consumerID);
      expect(response).toStrictEqual(consumer);
    });

    it("should not find the consumer by ID if it doesn't exist", async () => {
      when(consumerRepo.getConsumer("missing-consumer-id")).thenResolve(null);

      expect(async () => {
        await consumerService.getActiveConsumer("missing-consumer-id");
      }).rejects.toThrow(ServiceException);
    });

    it("should find the consumer by handle then throw exception based on locked account", async () => {
      const email = "mock-user@noba.com";
      const consumerID = "mock-consumer-1";
      const handle = "$mock-handle";
      const consumer = getKYCdConsumer(consumerID, email, handle);
      consumer.props.isLocked = true;

      when(consumerRepo.getConsumerByHandle(handle)).thenResolve(consumer);
      expect(async () => {
        await consumerService.getActiveConsumer(handle);
      }).rejects.toThrow(ServiceException);
    });

    it("should find the consumer by handle then throw exception based on disabled account", async () => {
      const email = "mock-user@noba.com";
      const consumerID = "mock-consumer-1";
      const handle = "$mock-handle";
      const consumer = getKYCdConsumer(consumerID, email, handle);
      consumer.props.isDisabled = true;

      when(consumerRepo.getConsumerByHandle(handle)).thenResolve(consumer);
      expect(async () => {
        await consumerService.getActiveConsumer(handle);
      }).rejects.toThrow(ServiceException);
    });

    it("should find the consumer by handle then throw exception based on no verificationData yet", async () => {
      const email = "mock-user@noba.com";
      const consumerID = "mock-consumer-1";
      const handle = "$mock-handle";
      const consumer = getKYCdConsumer(consumerID, email, handle);
      delete consumer.props.verificationData;

      when(consumerRepo.getConsumerByHandle(handle)).thenResolve(consumer);
      expect(async () => {
        await consumerService.getActiveConsumer(handle);
      }).rejects.toThrow(ServiceException);
    });

    it("should find the consumer by handle then throw exception based on non-approved KYC status", async () => {
      const email = "mock-user@noba.com";
      const consumerID = "mock-consumer-1";
      const handle = "$mock-handle";
      const consumer = getKYCdConsumer(consumerID, email, handle);
      consumer.props.verificationData.kycCheckStatus = KYCStatus.PENDING;

      when(consumerRepo.getConsumerByHandle(handle)).thenResolve(consumer);
      expect(async () => {
        await consumerService.getActiveConsumer(handle);
      }).rejects.toThrow(ServiceException);
    });

    it("should find the consumer by handle then throw exception based on not-allowed documentVerificationStatus", async () => {
      for (const status of [
        DocumentVerificationStatus.PENDING,
        DocumentVerificationStatus.REJECTED,
        DocumentVerificationStatus.REJECTED_DOCUMENT_INVALID_SIZE_OR_TYPE,
        DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY,
        DocumentVerificationStatus.REJECTED_DOCUMENT_REQUIRES_RECAPTURE,
      ]) {
        const email = "mock-user@noba.com";
        const consumerID = "mock-consumer-1";
        const handle = `$mock-handle-${status}`;
        const consumer = getKYCdConsumer(consumerID, email, handle);
        consumer.props.verificationData.documentVerificationStatus = status;

        when(consumerRepo.getConsumerByHandle(handle)).thenResolve(consumer);
        expect(async () => {
          await consumerService.getActiveConsumer(handle);
        }).rejects.toThrow(ServiceException);
      }
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
        lastName: lastName,
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
            handle: anyString(),
          }),
        ),
      ).thenResolve(updatedConsumerData);
      when(consumerRepo.isHandleTaken(anyString())).thenResolve(false);

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

    it("should throw error if unable to generate a handle", async () => {
      const email = "mock-user@noba.com";
      const firstName = "test.test";
      const lastName = "Last";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        email: email,
        firstName: firstName,
        lastName: lastName,
      });

      const updatedConsumerData = Consumer.createConsumer({
        ...consumer.props,
        firstName: firstName,
        lastName: lastName,
        handle: "<PLACEHOLDER_AS_HANDLE_IS_RANDOM>",
      });
      when(consumerRepo.isHandleTaken(anyString())).thenResolve(true);
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

      expect(
        consumerService.updateConsumer({
          id: consumer.props.id,
          firstName: firstName,
          lastName: lastName,
        }),
      ).rejects.toThrow(ServiceException);
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

  describe("generateDefaultHandle", () => {
    it("should generate a handle", () => {
      const firstName = "test.test.test.test";
      const lastName = "Last";

      const handle = consumerService.generateDefaultHandle(firstName, lastName);

      expect(handle.indexOf(".")).toBe(-1);
      expect(handle.indexOf("_")).toBe(-1);
      expect(handle.length).toBeGreaterThanOrEqual(3);
      expect(handle.length).toBeLessThanOrEqual(16);
      expect(handle[0] != "-").toBeTruthy();
      const handleSplit = handle.split("-");
      const firstHalf = handleSplit[0];
      const secondHalf = handleSplit[1];
      expect(firstHalf).toEqual("testtestte");
      expect(secondHalf.substring(0, 2)).toEqual("La");
      expect(secondHalf.length).toEqual(5);
    });

    it("should generate a handle containing unsupported characters", () => {
      const firstName = "test&()is{}*test";
      const lastName = "a";

      const handle = consumerService.generateDefaultHandle(firstName, lastName);

      expect(handle.indexOf(".")).toBe(-1);
      expect(handle.indexOf("_")).toBe(-1);
      expect(handle.length).toBeGreaterThanOrEqual(3);
      expect(handle.length).toBeLessThanOrEqual(16);
      expect(handle[0] != "-").toBeTruthy();
      const handleSplit = handle.split("-");
      const firstHalf = handleSplit[0];
      const secondHalf = handleSplit[1];
      expect(firstHalf).toEqual("testis");
      expect(secondHalf.substring(0, 1)).toEqual("a");
      expect(secondHalf.length).toEqual(4);
    });

    it("should generate a handle containing unsupported characters empty last name", () => {
      const firstName = "ñáé.íóúü.úü";
      const lastName = "...";

      const handle = consumerService.generateDefaultHandle(firstName, lastName);

      expect(handle.indexOf(".")).toBe(-1);
      expect(handle.indexOf("_")).toBe(-1);
      expect(handle.length).toBeGreaterThanOrEqual(3);
      expect(handle.length).toBeLessThanOrEqual(16);
      expect(handle[0] != "-").toBeTruthy();
      const handleSplit = handle.split("-");
      const firstHalf = handleSplit[0];
      const secondHalf = handleSplit[1];
      expect(firstHalf).toEqual("ñáéíóúüúü");
      expect(secondHalf.length).toEqual(3);
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

  describe("subscribeToPushNotifications", () => {
    it("should subscribe to push notifications", async () => {
      when(notificationService.subscribeToPushNotifications("consumer-id", "push-token")).thenResolve("push-token-id");
      expect(await consumerService.subscribeToPushNotifications("consumer-id", "push-token")).toBe("push-token-id");
    });
  });

  describe("unsubscribeToPushNotifications", () => {
    it("should unsubscribe to push notifications", async () => {
      when(notificationService.unsubscribeFromPushNotifications("consumer-id", "push-token")).thenResolve(
        "push-token-id",
      );
      expect(await consumerService.unsubscribeFromPushNotifications("consumer-id", "push-token")).toBe("push-token-id");
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

    it("should add new crypto wallet with phone as preferred notification medium", async () => {
      const email = "mock-user@noba.com";
      const walletID = "fake-wallet-id";

      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Fake",
        lastName: "Name",
        email: email,
        displayEmail: email,
        phone: "+1234567890",
      });

      const wallet = CryptoWallet.createCryptoWallet({
        id: walletID,
        address: "fake-address",
        status: WalletStatus.PENDING,
        consumerID: consumer.props.id,
      });

      when(otpService.saveOTP(consumer.props.phone, IdentityType.CONSUMER, 111111)).thenResolve();
      when(consumerRepo.getCryptoWalletForConsumer(walletID, consumer.props.id)).thenResolve(null);
      when(consumerRepo.addCryptoWallet(anything())).thenResolve();
      await consumerService.addOrUpdateCryptoWallet(consumer, wallet, NotificationMethod.PHONE);

      verify(consumerRepo.addCryptoWallet(deepEqual(wallet))).once();

      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_WALLET_UPDATE_VERIFICATION_CODE_EVENT,
          deepEqual({
            phone: consumer.props.phone,
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
      when(notificationService.sendNotification(anyString(), anything())).thenResolve();
      when(otpService.saveOTP(anyString(), anyString(), anyNumber())).thenResolve();
      await consumerService.sendOtpToPhone("123", phone);
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_PHONE_VERIFICATION_CODE_EVENT,
          deepEqual({
            phone: phone,
            otp: "111111",
          }),
        ),
      ).once();
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
      when(consumerRepo.isHandleTaken(anyString())).thenResolve(false);
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
        firstName: "mock",
        lastName: "mock",
      });
      const consumer2 = Consumer.createConsumer({
        id: "mockConsumer2",
        phone: "+15559993333",
        email: "mock2@mock.com",
        firstName: "mock",
        lastName: "mock",
      });

      const contactListDTO = [
        { phoneNumbers: [], emails: [consumer.props.email] },
        { phoneNumbers: [], emails: [consumer2.props.email] },
      ];

      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactListDTO[0]))).thenResolve(Result.ok(consumer));
      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactListDTO[1]))).thenResolve(Result.ok(consumer2));

      const consumers = await consumerService.findConsumersByContactInfo(contactListDTO);
      expect(consumers).toEqual([consumer, consumer2]);
    });

    it("should return null array if no consumers found", async () => {
      const contactListDTO = [
        { phoneNumbers: [], emails: ["mock-unknown@mock.com"] },
        { phoneNumbers: [], emails: ["mock-unknown-2@mock.com"] },
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
        firstName: "mock",
        lastName: "mock",
      });
      const consumer2 = Consumer.createConsumer({
        id: "mockConsumer2",
        phone: "+15559993333",
        firstName: "mock",
        lastName: "mock",
      });

      const contactListDTO = [
        { phoneNumbers: [{ countryCode: "US", digits: "5553339999" }], emails: [] },
        { phoneNumbers: [{ countryCode: "CO", digits: "5553339999" }], emails: [] },
      ];

      const contactInfo = { phoneNumbers: ["+15553339999"], emails: [] };
      const contactInfo2 = { phoneNumbers: ["+575553339999"], emails: [] };
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
        { phoneNumbers: [], emails: [consumer.props.email] },
        { phoneNumbers: [], emails: [consumer2.props.email] },
      ];

      const contactInfo = { phoneNumbers: [], emails: ["mock@mock.com"] };
      const contactInfo2 = { phoneNumbers: [], emails: ["mock2@mock.com"] };
      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactInfo))).thenResolve(Result.ok(consumer));
      when(consumerRepo.findConsumerByContactInfo(deepEqual(contactInfo2))).thenResolve(Result.ok(consumer2));

      await consumerService.findConsumersByContactInfo(contactListDTO);
    });
  });

  describe("findConsumersByPublicInfo", () => {
    it("should find consumers by public info", async () => {
      const consumer = Consumer.createConsumer({
        id: "mockConsumer",
        phone: "+15559993333",
        email: "mock@mock.com",
        firstName: "jon",
        lastName: "doe",
        verificationData: {
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });
      const consumer2 = Consumer.createConsumer({
        id: "mockConsumer2",
        phone: "+15559993333",
        email: "mock2@mock.com",
        firstName: "jon",
        lastName: "snow",
        verificationData: {
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      const expectedConsumers = [consumer, consumer2];

      when(consumerRepo.findConsumersByPublicInfo("jon", 3)).thenResolve(Result.ok<Array<Consumer>>(expectedConsumers));

      const consumers = await consumerService.findConsumersByPublicInfo("jon", 3);
      expect(consumers).toEqual(expectedConsumers);
    });

    it("should only find active consumers by public info", async () => {
      const consumer = Consumer.createConsumer({
        id: "mockConsumer",
        phone: "+15559993333",
        email: "mock@mock.com",
        firstName: "jon",
        lastName: "doe",
        isLocked: true,
        verificationData: {
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });
      const consumer2 = Consumer.createConsumer({
        id: "mockConsumer2",
        phone: "+15559993333",
        email: "mock2@mock.com",
        firstName: "jon",
        lastName: "snow",
        verificationData: {
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: true,
          kycCheckStatus: KYCStatus.FLAGGED,
          documentVerificationStatus: DocumentVerificationStatus.REJECTED,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      when(consumerRepo.findConsumersByPublicInfo("jon", 3)).thenResolve(Result.ok<Array<Consumer>>([]));

      const consumers = await consumerService.findConsumersByPublicInfo("jon", 3);
      expect(consumers).toEqual([]);
    });

    it("should return empty array if no consumers found", async () => {
      when(consumerRepo.findConsumersByPublicInfo("unknown", 2)).thenResolve(Result.ok([]));

      const consumers = await consumerService.findConsumersByPublicInfo("unknown", 2);
      expect(consumers).toEqual([]);
    });

    it("should throw ServiceException if findConsumers fails", async () => {
      when(consumerRepo.findConsumersByPublicInfo("unknown", 2)).thenResolve(Result.fail("Prisma failed!"));

      expect(consumerService.findConsumersByPublicInfo("unknown", 2)).rejects.toThrow(ServiceException);
    });
  });

  describe("findConsumersByStructuredFields", () => {
    it("should find consumers by specific ID", async () => {
      const consumer = getRandomConsumer();

      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      const structuredFieldSearchSpy = jest.spyOn(consumerRepo, "findConsumersByStructuredFields");

      const consumers = await consumerService.findConsumers({ consumerID: consumer.props.id });
      expect(consumers).toEqual([consumer]);
      expect(structuredFieldSearchSpy).not.toHaveBeenCalled();
    });

    it("should return empty array if no consumers found by specific ID", async () => {
      when(consumerRepo.getConsumer("1234567890")).thenResolve(undefined);

      const consumers = await consumerService.findConsumers({ consumerID: "1234567890" });
      expect(consumers).toEqual([]);
    });

    it("should find consumers by name", async () => {
      const consumer = getRandomConsumer();
      consumer.props.firstName = "Rosie";
      consumer.props.lastName = "Noba";

      when(consumerRepo.findConsumersByStructuredFields(deepEqual({ name: "Rosie Noba" }))).thenResolve(
        Result.ok<Array<Consumer>>([consumer]),
      );
      const idSearchSpy = jest.spyOn(consumerRepo, "getConsumer");

      const consumers = await consumerService.findConsumers({ name: "Rosie Noba" });
      expect(consumers).toEqual([consumer]);
      expect(idSearchSpy).not.toHaveBeenCalled();
    });

    it("should find consumers by all fields", async () => {
      const consumer = Consumer.createConsumer({
        id: "mockConsumer",
        phone: "+15559993333",
        email: "rosie@noba.com",
        firstName: "Rosie",
        lastName: "Noba",
        handle: "rosie-noba",
        isLocked: false,
        verificationData: {
          provider: KYCProvider.SARDINE,
          isSuspectedFraud: false,
          kycCheckStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          documentVerificationTimestamp: new Date(),
          kycVerificationTimestamp: new Date(),
        },
      });

      when(
        consumerRepo.findConsumersByStructuredFields(
          deepEqual({
            name: `${consumer.props.firstName} ${consumer.props.lastName}`,
            email: consumer.props.email,
            phone: consumer.props.phone,
            handle: consumer.props.handle,
            kycStatus: consumer.props.verificationData.kycCheckStatus,
          }),
        ),
      ).thenResolve(Result.ok<Array<Consumer>>([consumer]));
      const idSearchSpy = jest.spyOn(consumerRepo, "getConsumer");

      const consumers = await consumerService.findConsumers({
        name: "Rosie Noba",
        email: consumer.props.email,
        phone: consumer.props.phone,
        handle: consumer.props.handle,
        kycStatus: consumer.props.verificationData.kycCheckStatus,
      });
      expect(consumers).toEqual([consumer]);
      expect(idSearchSpy).not.toHaveBeenCalled();
    });

    it("should return empty array if no consumers found", async () => {
      when(consumerRepo.findConsumersByStructuredFields(deepEqual({ name: "Blah Blah" }))).thenResolve(Result.ok([]));

      const consumers = await consumerService.findConsumers({ name: "Blah Blah" });
      expect(consumers).toEqual([]);
    });

    it("should throw ServiceException if findConsumers fails", async () => {
      when(consumerRepo.findConsumersByStructuredFields(deepEqual({ name: "Blah Blah" }))).thenResolve(
        Result.fail("Prisma failed!"),
      );

      expect(consumerService.findConsumers({ name: "Blah Blah" })).rejects.toThrow(ServiceException);
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
      when(consumerRepo.isHandleTaken(anyString())).thenResolve(false);
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
      expect(async () => await consumerService.isHandleAvailable("ab")).rejects.toThrow(ServiceException);
      expect(async () => await consumerService.isHandleAvailable("ab")).rejects.toThrow(
        "'handle' should be between 3 and 22 charcters long.",
      );
    });

    it("should throw BadRequestException if 'handle' is greater than 22 characters", async () => {
      expect(async () => await consumerService.isHandleAvailable("abcdefghijklmnopqrstuva")).rejects.toThrow(
        ServiceException,
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
      expect(async () => await consumerService.isHandleAvailable("-abcd")).rejects.toThrow(ServiceException);
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
      expect(async () => await consumerService.isHandleAvailable("ab_")).rejects.toThrow(ServiceException);
      expect(async () => await consumerService.isHandleAvailable("-abcd")).rejects.toThrow(
        "'handle' can't start with an '-' and can only contain alphanumeric characters & '-'.",
      );
    });

    it("should throw BadRequestException if 'handle' correspond to a spanish 'bad word'", async () => {
      try {
        await consumerService.isHandleAvailable("pendejo");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toBe("Specified 'handle' is reserved. Please choose a different one.");
      }
    });

    it("should throw BadRequestException if 'handle' correspond to a english 'bad word'", async () => {
      try {
        await consumerService.isHandleAvailable("asshole");
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
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

  describe("registerWithAnEmployer", () => {
    it("should register an Employee by ID successfully", async () => {
      const consumer = getRandomConsumer();
      const employer = getRandomEmployer();
      const employee = getRandomEmployee(consumer.props.id, employer.id);

      when(employeeService.createEmployee(100, employer.id, consumer.props.id)).thenResolve(employee);
      when(consumerRepo.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(notificationService.sendNotification(anyString(), anything())).thenResolve();

      const response = await consumerService.registerWithAnEmployer(employer.id, consumer.props.id, 100);

      expect(response).toEqual(employee);

      const [propagatedNobaEmployeeID, propagatedConsumer] = capture(notificationService.sendNotification).last();
      expect(propagatedNobaEmployeeID).toEqual(employee.id);
      expect(propagatedConsumer).toEqual(consumer);
    });
  });

  describe("listLinkedEmployers", () => {
    it("should return a list of linked Employers", async () => {
      const consumer = getRandomConsumer();
      const employer = getRandomEmployer();
      const employee = getRandomEmployee(consumer.props.id, employer.id);

      when(employeeService.getEmployeesForConsumerID(consumer.props.id)).thenResolve([employee]);

      const response = await consumerService.listLinkedEmployers(consumer.props.id);

      expect(response).toEqual([employee]);
    });
  });

  describe("updateEmployerAllocationAmount", () => {
    it("should throw ServiceException if allocationAmountInPesos is less than zero", async () => {
      try {
        await consumerService.updateEmployerAllocationAmount("employerID", "consumerID", -10);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("'allocationAmountInPesos'"));
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
      }
    });

    it("should throw ServiceException if employerID is undefined or null", async () => {
      try {
        await consumerService.updateEmployerAllocationAmount(undefined, "consumerID", 10);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("'employerID'"));
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
      }

      try {
        await consumerService.updateEmployerAllocationAmount(null, "consumerID", 10);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("'employerID'"));
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
      }
    });

    it("should throw ServiceException if Employer with specified consumerID is undefined or null", async () => {
      try {
        await consumerService.updateEmployerAllocationAmount("employerID", undefined, 10);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("'consumerID'"));
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
      }

      try {
        await consumerService.updateEmployerAllocationAmount("employerID", null, 10);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("'consumerID'"));
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
      }
    });

    it("should throw ServiceException if the consumer is not linked already with the Employer", async () => {
      const employer = getRandomEmployer();
      when(employeeService.getEmployeeByConsumerAndEmployerID("consumerID", employer.id)).thenResolve(null);

      try {
        await consumerService.updateEmployerAllocationAmount(employer.id, "consumerID", 10);
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("'consumerID'"));
        expect(err.errorCode).toEqual(ServiceErrorCode.DOES_NOT_EXIST);
      }
    });

    it("should update the allocation amount for an Employer", async () => {
      const employer = getRandomEmployer();
      const employee = getRandomEmployee("consumerID", employer.id);
      employee.allocationAmount = 1256;

      when(employeeService.getEmployeeByConsumerAndEmployerID("consumerID", employer.id)).thenResolve(employee);
      when(
        employeeService.updateEmployee(
          employee.id,
          deepEqual({
            allocationAmount: employee.allocationAmount,
          }),
        ),
      ).thenResolve(employee);
      when(notificationService.updateEmployeeAllocationInBubble(employee.id, 1256)).thenResolve();

      const response = await consumerService.updateEmployerAllocationAmount(employer.id, "consumerID", 1256);

      expect(response).toEqual(employee);
    });
  });

  describe("sendEmployerRequestEmail", () => {
    it("should throw ServiceException if email address is empty", async () => {
      try {
        await consumerService.sendEmployerRequestEmail(null, null, "", "");
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("Email address is required"));
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
      }
    });

    it("should throw ServiceException if email address is invalid", async () => {
      try {
        await consumerService.sendEmployerRequestEmail("bademail", null, "Fake", "Name");
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceException);
        expect(err.message).toEqual(expect.stringContaining("Email address is invalid"));
        expect(err.errorCode).toEqual(ServiceErrorCode.SEMANTIC_VALIDATION);
      }
    });

    it("should send a notification", async () => {
      const email = "rosie@noba.com";
      const locale = "en";
      await consumerService.sendEmployerRequestEmail(email, locale, "Fake", "Name");
      verify(
        notificationService.sendNotification(
          NotificationEventType.SEND_EMPLOYER_REQUEST_EVENT,

          deepEqual({
            email: email,
            locale: locale,
            firstName: "Fake",
            lastName: "Name",
          }),
        ),
      ).once();
    });
  });
});
