import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { UserEmailUpdateRequest } from "test/api_client";
import { deepEqual, instance, verify, when } from "ts-mockito";
import { PhoneVerificationOtpRequest } from "../../../../test/api_client/models/PhoneVerificationOtpRequest";
import { UserPhoneUpdateRequest } from "../../../../test/api_client/models/UserPhoneUpdateRequest";
import { Result } from "../../../core/logic/Result";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { AuthenticatedUser } from "../../../modules/auth/domain/AuthenticatedUser";
import { getMockPlaidClientWithDefaults } from "../../../modules/psp/mocks/mock.plaid.client";
import { PlaidClient } from "../../../modules/psp/plaid.client";
import { X_NOBA_API_KEY } from "../../auth/domain/HeaderConstants";
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
import { PaymentMethod, PaymentMethodType } from "../domain/PaymentMethod";
import { PaymentProvider } from "../domain/PaymentProvider";
import { VerificationProviders } from "../domain/KYC";
import { DocumentVerificationStatus, KYCStatus, PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";
import { AddPaymentMethodDTO, PaymentType } from "../dto/AddPaymentMethodDTO";
import { EmailVerificationOtpRequest } from "../dto/EmailVerificationDTO";
import { UpdateConsumerRequestDTO } from "../dto/UpdateConsumerRequestDTO";
import { UpdatePaymentMethodDTO } from "../dto/UpdatePaymentMethodDTO";
import { ConsumerMapper } from "../mappers/ConsumerMapper";
import { getMockConsumerServiceWithDefaults } from "../mocks/mock.consumer.service";

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
        _id: "mock-consumer-1",
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
            ...consumer.props,
            ...requestData,
          }),
        ),
      ).thenResolve(
        Consumer.createConsumer({
          ...consumer.props,
          ...requestData,
        }),
      );

      const result = await consumerController.updateConsumer(
        {
          user: { entity: consumer },
        },
        requestData,
      );

      expect(result).toStrictEqual(
        consumerMapper.toDTO(
          Consumer.createConsumer({
            ...consumer.props,
            ...requestData,
          }),
        ),
      );
    });

    it("should add a payment method with 'Card' type", async () => {
      const paymentMethodRequest: AddPaymentMethodDTO = {
        type: PaymentType.CARD,
        name: "Fake Card",
        cardDetails: {
          cardNumber: "12345678901234",
          expiryMonth: 2,
          expiryYear: 2023,
          cvv: "765",
        },
      } as any;

      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      when(consumerService.addPaymentMethod(deepEqual(consumer), deepEqual(paymentMethodRequest))).thenResolve(
        Consumer.createConsumer({
          ...consumer.props,
          paymentMethods: [
            {
              type: PaymentMethodType.CARD,
              paymentProviderID: PaymentProvider.CHECKOUT,
              paymentToken: "faketoken1234",
              name: paymentMethodRequest.name,
              cardData: {
                cardType: "VISA",
                first6Digits: "123456",
                last4Digits: "1234",
              },
              imageUri: "testimage",
              status: PaymentMethodStatus.APPROVED,
              isDefault: false,
            },
          ],
        }),
      );

      const result = await consumerController.addPaymentMethod(paymentMethodRequest, {
        user: {
          entity: consumer,
        } as AuthenticatedUser,
      });

      expect(result._id).toBe(consumer.props.id);
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0].name).toBe(paymentMethodRequest.name);
    });

    it("should reject the request for non-consumers", async () => {
      expect(async () => {
        await consumerController.addPaymentMethod(undefined, {
          user: {
            entity: undefined,
          } as AuthenticatedUser,
        });
      }).rejects.toThrow(ForbiddenException);
    });

    it("should throw 400 error if 'cardDetails' is not present for 'CARD' type", async () => {
      const paymentMethodRequest: AddPaymentMethodDTO = {
        type: PaymentType.CARD,
        name: "Fake Card",
        achDetails: {
          token: "fake-token",
        },
      } as any;

      const consumer: Consumer = Consumer.createConsumer({
        _id: "mock-consumer-id",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      try {
        await consumerController.addPaymentMethod(paymentMethodRequest, {
          user: {
            entity: consumer,
          } as AuthenticatedUser,
        });
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it("should throw 400 error if 'achDetails' is not present for 'ACH' type", async () => {
      const paymentMethodRequest: AddPaymentMethodDTO = {
        type: PaymentType.ACH,
        name: "Fake Bank Account",
        cardDetails: {
          cardNumber: "1234567890",
          cvv: "122",
          expiryMonth: 12,
          expiryYear: 2024,
        },
      } as any;

      const consumer: Consumer = Consumer.createConsumer({
        _id: "mock-consumer-id",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      try {
        await consumerController.addPaymentMethod(paymentMethodRequest, {
          user: {
            entity: consumer,
          } as AuthenticatedUser,
        });
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
      }
    });

    it("should add a payment method with missing cardName or nick name", async () => {
      const paymentMethodRequest: AddPaymentMethodDTO = {
        name: "",
        type: PaymentType.CARD,
        cardDetails: {
          cardNumber: "12345678901234",
          expiryMonth: 2,
          expiryYear: 2023,
          cvv: "765",
        },
      } as any;

      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      when(consumerService.addPaymentMethod(deepEqual(consumer), deepEqual(paymentMethodRequest))).thenResolve(
        Consumer.createConsumer({
          ...consumer.props,
          paymentMethods: [
            {
              type: PaymentMethodType.CARD,
              paymentProviderID: PaymentProvider.CHECKOUT,
              paymentToken: "faketoken1234",
              cardData: {
                cardType: "VISA",
                first6Digits: "123456",
                last4Digits: "1234",
              },
              imageUri: "testimage",
              status: PaymentMethodStatus.APPROVED,
              isDefault: false,
            },
          ],
        }),
      );

      const result = await consumerController.addPaymentMethod(paymentMethodRequest, {
        user: {
          entity: consumer,
        } as AuthenticatedUser,
      });

      expect(result._id).toBe(consumer.props.id);
      expect(result.paymentMethods.length).toBe(1);
    });

    it("should update cardDetails", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "faketoken1234",
            cardData: {
              cardType: "VISA",
              first6Digits: "123456",
              last4Digits: "1234",
            },
            imageUri: "testimage",
            status: PaymentMethodStatus.APPROVED,
            isDefault: false,
          },
        ],
      });

      const updatePaymentMethodDTO: UpdatePaymentMethodDTO = {
        isDefault: true,
      };

      const updatedPaymentMethod: PaymentMethod = {
        ...consumer.props.paymentMethods[0],
        isDefault: true,
      };

      when(consumerService.updatePaymentMethod(consumer.props.id, deepEqual(updatedPaymentMethod))).thenResolve(
        Consumer.createConsumer({
          ...consumer.props,
          paymentMethods: [updatedPaymentMethod],
        }),
      );

      const res = await consumerController.updatePaymentMethod(
        updatedPaymentMethod.paymentToken,
        consumer,
        updatePaymentMethodDTO,
      );

      expect(res).toStrictEqual(
        consumerMapper.toDTO(
          Consumer.createConsumer({
            ...consumer.props,
            paymentMethods: [updatedPaymentMethod],
          }),
        ),
      );
    });
  });

  describe("phoneUpdateOtpRequest", () => {
    it("should send a phone update OTP request", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
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

      await consumerController.requestOtpToUpdatePhone(
        {
          user: {
            entity: consumer,
          } as AuthenticatedUser,
        },
        phoneUpdateOtpRequest,
      );

      verify(consumerService.sendOtpToPhone(consumer.props.id, phone)).called();
    });

    it("should reject the request for non-consumers", async () => {
      expect(async () => {
        await consumerController.requestOtpToUpdatePhone(
          {
            user: {
              entity: undefined,
            } as AuthenticatedUser,
          },
          undefined,
        );
      }).rejects.toThrow(ForbiddenException);
    });

    it("should reject the request if phone already exists for this or another account", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      const phone = "+1234567890";

      const phoneUpdateOtpRequest: PhoneVerificationOtpRequest = {
        phone: phone,
      };

      when(consumerService.findConsumerByEmailOrPhone(phone)).thenResolve(
        Result.ok(Consumer.createConsumer({ phone: phone })),
      );
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.sendOtpToPhone(consumer.props.id, phone)).thenResolve();

      try {
        await consumerController.requestOtpToUpdatePhone(
          {
            user: {
              entity: consumer,
            } as AuthenticatedUser,
          },
          phoneUpdateOtpRequest,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe("phone", () => {
    it("should add or update phone", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
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

      when(consumerService.findConsumerByEmailOrPhone(phone)).thenResolve(Result.fail("Non-existent user"));
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.updateConsumerPhone(consumer, phoneUpdateRequest)).thenResolve(expectedUpdatedConsumer);

      const updatedConsumer = await consumerController.updatePhone(
        {
          user: {
            entity: consumer,
          } as AuthenticatedUser,
        },
        phoneUpdateRequest,
      );

      verify(consumerService.updateConsumerPhone(consumer, phoneUpdateRequest)).called();

      expect(updatedConsumer).toEqual(consumerMapper.toDTO(expectedUpdatedConsumer));
    });

    it("should reject the request for non-consumers", async () => {
      expect(async () => {
        await consumerController.updatePhone(
          {
            user: {
              entity: undefined,
            } as AuthenticatedUser,
          },
          undefined,
        );
      }).rejects.toThrow(ForbiddenException);
    });

    it("should reject the request if phone already exists for this or another account", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
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

      when(consumerService.updateConsumerPhone(consumer, phoneUpdateRequest)).thenThrow(new BadRequestException());

      try {
        await consumerController.updatePhone(
          {
            user: {
              entity: consumer,
            } as AuthenticatedUser,
          },
          phoneUpdateRequest,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe("emailUpdateOtpRequest", () => {
    it("should send an email update OTP request", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
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

      await consumerController.requestOtpToUpdateEmail(
        {
          user: {
            entity: consumer,
          } as AuthenticatedUser,
        },
        {
          "x-noba-api-key": apiKey,
        },
        emailUpdateOtpRequest,
      );

      verify(consumerService.sendOtpToEmail(email, consumer)).called();
    });

    it("should reject the request for non-consumers", async () => {
      expect(async () => {
        await consumerController.requestOtpToUpdateEmail(
          {
            user: {
              entity: undefined,
            } as AuthenticatedUser,
          },
          undefined,
          undefined,
        );
      }).rejects.toThrow(ForbiddenException);
    });

    it("should reject the request if email already exists for this or another account", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
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
      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.sendOtpToEmail(email, consumer)).thenResolve();
      when(consumerService.findConsumerByEmailOrPhone(email)).thenResolve(
        Result.ok(Consumer.createConsumer({ email: email })),
      );

      try {
        await consumerController.requestOtpToUpdateEmail(
          {
            user: {
              entity: consumer,
            } as AuthenticatedUser,
          },
          {
            "x-noba-api-key": apiKey,
          },
          emailUpdateOtpRequest,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe("email", () => {
    it("should add or update email", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
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

      const updatedConsumer = await consumerController.updateEmail(
        {
          user: {
            entity: consumer,
          } as AuthenticatedUser,
        },
        emailUpdateRequest,
      );

      verify(consumerService.updateConsumerEmail(consumer, emailUpdateRequest)).called();

      expect(updatedConsumer).toEqual(consumerMapper.toDTO(expectedUpdatedConsumer));
    });

    it("should reject the request for non-consumers", async () => {
      expect(async () => {
        await consumerController.updateEmail(
          {
            user: {
              entity: undefined,
            } as AuthenticatedUser,
          },
          undefined,
        );
      }).rejects.toThrow(ForbiddenException);
    });

    it("should reject the request if email already exists for this or another account", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
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

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      when(consumerService.updateConsumerEmail(consumer, emailUpdateRequest)).thenThrow(new BadRequestException());

      try {
        await consumerController.updateEmail(
          {
            user: {
              entity: consumer,
            } as AuthenticatedUser,
          },
          emailUpdateRequest,
        );
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe("external state mapping tests", () => {
    it("should return status as APPROVED, walletStatus and paymentMethodStatus as APPROVED and all payment methods and wallets when all are Approved", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        isSuspectedFraud: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [
          {
            address: "wallet-1",
            status: WalletStatus.APPROVED,
          },
        ],
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "faketoken1234",
            cardData: {
              cardType: "VISA",
              first6Digits: "123456",
              last4Digits: "1234",
            },
            imageUri: "testimage",
            status: PaymentMethodStatus.APPROVED,
            isDefault: false,
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          verificationProvider: VerificationProviders.SARDINE,
        },
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      const response = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "noba-api-key" },
        { user: { entity: consumer } },
      );

      expect(response.status).toBe(UserState.APPROVED);
      expect(response.kycVerificationData.kycVerificationStatus).toBe(KycVerificationState.APPROVED);
      expect(response.documentVerificationData.documentVerificationStatus).toBe(DocumentVerificationState.VERIFIED);
      expect(response.walletStatus).toBe(AggregatedWalletState.APPROVED);
      expect(response.paymentMethodStatus).toBe(AggregatedPaymentMethodState.APPROVED);
    });

    it("should return wallet status as APPROVED when some wallets are in Pending state and atleast one wallet is in APPROVED state", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        isSuspectedFraud: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [
          {
            address: "wallet-1",
            status: WalletStatus.APPROVED,
          },
          {
            address: "wallet-2",
            status: WalletStatus.PENDING,
          },
        ],
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "faketoken1234",
            cardData: {
              cardType: "VISA",
              first6Digits: "123456",
              last4Digits: "1234",
            },
            imageUri: "testimage",
            status: PaymentMethodStatus.APPROVED,
            isDefault: false,
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          verificationProvider: VerificationProviders.SARDINE,
        },
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      const response = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "noba-api-key" },
        { user: { entity: consumer } },
      );

      expect(response.status).toBe(UserState.APPROVED);
      expect(response.kycVerificationData.kycVerificationStatus).toBe(KycVerificationState.APPROVED);
      expect(response.documentVerificationData.documentVerificationStatus).toBe(DocumentVerificationState.VERIFIED);
      expect(response.walletStatus).toBe(AggregatedWalletState.APPROVED);
      expect(response.paymentMethodStatus).toBe(AggregatedPaymentMethodState.APPROVED);
    });

    it("should return user status as PERMANENT_HOLD and walletStatus as NOT_SUBMITTED and filtered wallet list when one wallet is REJECTED", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        isSuspectedFraud: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [
          {
            address: "wallet-1",
            status: WalletStatus.APPROVED,
          },
          {
            address: "wallet-2",
            status: WalletStatus.REJECTED,
          },
        ],
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "faketoken1234",
            cardData: {
              cardType: "VISA",
              first6Digits: "123456",
              last4Digits: "1234",
            },
            imageUri: "testimage",
            status: PaymentMethodStatus.APPROVED,
            isDefault: false,
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          verificationProvider: VerificationProviders.SARDINE,
        },
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      const response = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "noba-api-key" },
        { user: { entity: consumer } },
      );

      expect(response.status).toBe(UserState.PERMANENT_HOLD);
      expect(response.walletStatus).toBe(AggregatedWalletState.NOT_SUBMITTED);
      expect(response.paymentMethodStatus).toBe(AggregatedPaymentMethodState.APPROVED);
      expect(response.cryptoWallets.length).toBe(1);
    });

    it("should return user status as PENDING, paymentMethodStatus as PENDING and filtered payment method list when payment method is Flagged", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        isSuspectedFraud: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [
          {
            address: "wallet-1",
            status: WalletStatus.APPROVED,
          },
        ],
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "faketoken1234",
            cardData: {
              cardType: "VISA",
              first6Digits: "123456",
              last4Digits: "1234",
            },
            imageUri: "testimage",
            status: PaymentMethodStatus.FLAGGED,
            isDefault: false,
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          verificationProvider: VerificationProviders.SARDINE,
        },
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      const response = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "noba-api-key" },
        { user: { entity: consumer } },
      );

      expect(response.status).toBe(UserState.PENDING);
      expect(response.walletStatus).toBe(AggregatedWalletState.APPROVED);
      expect(response.paymentMethodStatus).toBe(AggregatedPaymentMethodState.PENDING);
      expect(response.paymentMethods.length).toBe(0);
      expect(response.kycVerificationData.kycVerificationStatus).toBe(KycVerificationState.APPROVED);
      expect(response.documentVerificationData.documentVerificationStatus).toBe(DocumentVerificationState.NOT_REQUIRED);
    });

    it("tests REJECTED kycVerificationStatus, NOT_SUBMITTED documentVerificationStatus, ACH payment method with APPROVED state", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        isSuspectedFraud: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [
          {
            address: "wallet-1",
            status: WalletStatus.APPROVED,
          },
        ],
        paymentMethods: [
          {
            type: PaymentMethodType.ACH,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "faketoken1234",
            achData: {
              mask: "fake-mask",
              accountType: "fake-type",
              accessToken: "fake-token",
              accountID: "fake-acc-id",
              itemID: "fake-item",
            },
            imageUri: "testimage",
            status: PaymentMethodStatus.APPROVED,
            isDefault: false,
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.REJECTED,
          documentVerificationStatus: DocumentVerificationStatus.REQUIRED,
          verificationProvider: VerificationProviders.SARDINE,
        },
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      const response = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "noba-api-key" },
        { user: { entity: consumer } },
      );

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
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        isSuspectedFraud: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [],
        paymentMethods: [],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY,
          verificationProvider: VerificationProviders.SARDINE,
        },
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      const response = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "noba-api-key" },
        { user: { entity: consumer } },
      );

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
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: true,
        isLocked: false,
        isSuspectedFraud: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [],
        paymentMethods: [],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY,
          verificationProvider: VerificationProviders.SARDINE,
        },
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      const response = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "noba-api-key" },
        { user: { entity: consumer } },
      );

      expect(response.status).toBe(UserState.TEMPORARY_HOLD);
    });

    it("should return status as PERMANENT_HOLD when atleast one payment method is REJECTED", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        isSuspectedFraud: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [],
        paymentMethods: [
          {
            type: PaymentMethodType.ACH,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "faketoken1234",
            achData: {
              mask: "fake-mask",
              accountType: "fake-type",
              accessToken: "fake-token",
              accountID: "fake-acc-id",
              itemID: "fake-item",
            },
            imageUri: "testimage",
            status: PaymentMethodStatus.REJECTED,
            isDefault: false,
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.REJECTED_DOCUMENT_POOR_QUALITY,
          verificationProvider: VerificationProviders.SARDINE,
        },
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      const response = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "noba-api-key" },
        { user: { entity: consumer } },
      );

      expect(response.status).toBe(UserState.PERMANENT_HOLD);
    });

    it("should return user status as ACTION_REQUIRED, paymentMethodStatus as NOT_SUBMITTED and cryptoWalletStatus as NOT_SUBMITTED", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        isDisabled: false,
        isLocked: false,
        isSuspectedFraud: false,
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [
          {
            address: "wallet-1",
            status: WalletStatus.DELETED,
          },
        ],
        paymentMethods: [
          {
            type: PaymentMethodType.CARD,
            paymentProviderID: PaymentProvider.CHECKOUT,
            paymentToken: "faketoken1234",
            cardData: {
              cardType: "VISA",
              first6Digits: "123456",
              last4Digits: "1234",
            },
            imageUri: "testimage",
            status: PaymentMethodStatus.DELETED,
            isDefault: false,
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.NOT_REQUIRED,
          verificationProvider: VerificationProviders.SARDINE,
        },
      });

      when(consumerService.getConsumer(consumer.props.id)).thenResolve(consumer);
      const response = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "noba-api-key" },
        { user: { entity: consumer } },
      );

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
