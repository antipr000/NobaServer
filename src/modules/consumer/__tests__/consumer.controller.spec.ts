import { Test, TestingModule } from "@nestjs/testing";
import { deepEqual, instance, when } from "ts-mockito";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { ConsumerController } from "../consumer.controller";
import { ConsumerService } from "../consumer.service";
import { Consumer } from "../domain/Consumer";
import { getMockPartnerServiceWithDefaults } from "../../partner/mocks/mock.partner.service";
import { AddPaymentMethodDTO, PaymentType } from "../dto/AddPaymentMethodDTO";
import { ConsumerDTO } from "../dto/ConsumerDTO";
import { UpdateConsumerRequestDTO } from "../dto/UpdateConsumerRequestDTO";
import { ConsumerMapper } from "../mappers/ConsumerMapper";
import { getMockConsumerServiceWithDefaults } from "../mocks/mock.consumer.service";
import { PartnerService } from "../../partner/partner.service";
import { DocumentVerificationStatus, KYCStatus, PaymentMethodStatus, WalletStatus } from "../domain/VerificationStatus";
import { X_NOBA_API_KEY } from "../../auth/domain/HeaderConstants";
import { Partner } from "../../../modules/partner/domain/Partner";
import { AuthenticatedUser } from "../../../modules/auth/domain/AuthenticatedUser";
import { PaymentProvider } from "../domain/PaymentProvider";
import { PaymentMethodType } from "../domain/PaymentMethod";
import { PlaidClient } from "../../../modules/psp/plaid.client";
import { getMockPlaidClientWithDefaults } from "../../../modules/psp/mocks/mock.plaid.client";
import { BadRequestException } from "@nestjs/common";
import { VerificationProviders } from "../domain/VerificationData";
import { UserState } from "../domain/ExternalStates";

describe("ConsumerController", () => {
  let consumerController: ConsumerController;
  let consumerService: ConsumerService;
  let partnerService: PartnerService;
  let plaidClient: PlaidClient;

  const consumerMapper = new ConsumerMapper();

  jest.setTimeout(30000);

  beforeEach(async () => {
    consumerService = getMockConsumerServiceWithDefaults();
    partnerService = getMockPartnerServiceWithDefaults();
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
          provide: PartnerService,
          useFactory: () => instance(partnerService),
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
    it("should return only wallets belonging to the 'partner' if 'viewOtherWallets' is false", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [
          {
            address: "wallet-1",
            partnerID: "1111111111",
            status: WalletStatus.APPROVED,
            isPrivate: false,
          },
          {
            address: "wallet-2",
            partnerID: "2222222222",
            status: WalletStatus.APPROVED,
            isPrivate: false,
          },
          {
            address: "wallet-3",
            partnerID: "1111111111",
            status: WalletStatus.APPROVED,
            isPrivate: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumer.props._id)).thenResolve(consumer);

      const partner1: Partner = Partner.createPartner({
        _id: "1111111111",
        apiKey: "partner-1-api-key",
        name: "partner1",
        config: {
          viewOtherWallets: false,
        } as any,
      });
      const partner2: Partner = Partner.createPartner({
        _id: "2222222222",
        apiKey: "partner-2-api-key",
        name: "partner2",
        config: {
          viewOtherWallets: false,
        } as any,
      });
      when(partnerService.getPartnerFromApiKey("partner-1-api-key")).thenResolve(partner1);
      when(partnerService.getPartnerFromApiKey("partner-2-api-key")).thenResolve(partner2);

      const result: ConsumerDTO = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "partner-1-api-key" },
        { user: { entity: consumer } },
      );

      const filteredConsumer: Consumer = consumer;
      filteredConsumer.props.cryptoWallets = [
        {
          address: "wallet-1",
          partnerID: "1111111111",
          status: WalletStatus.APPROVED,
          isPrivate: false,
        },
        {
          address: "wallet-3",
          partnerID: "1111111111",
          status: WalletStatus.APPROVED,
          isPrivate: false,
        },
      ];
      expect(result).toStrictEqual(consumerMapper.toDTO(filteredConsumer));
    });

    it("should filter the private wallets of 'other partners' in the response", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [
          {
            address: "wallet-1",
            partnerID: "1111111111",
            status: WalletStatus.APPROVED,
            isPrivate: true,
          },
          {
            address: "wallet-2",
            partnerID: "2222222222",
            status: WalletStatus.APPROVED,
            isPrivate: true,
          },
          {
            address: "wallet-3",
            partnerID: "1111111111",
            status: WalletStatus.APPROVED,
            isPrivate: true,
          },
        ],
      });
      when(consumerService.getConsumer(consumer.props._id)).thenResolve(consumer);

      const partner1: Partner = Partner.createPartner({
        _id: "1111111111",
        apiKey: "partner-1-api-key",
        name: "partner1",
        config: {
          viewOtherWallets: true,
        } as any,
      });
      const partner2: Partner = Partner.createPartner({
        _id: "2222222222",
        apiKey: "partner-2-api-key",
        name: "partner2",
        config: {
          viewOtherWallets: false,
        } as any,
      });
      when(partnerService.getPartnerFromApiKey("partner-1-api-key")).thenResolve(partner1);
      when(partnerService.getPartnerFromApiKey("partner-2-api-key")).thenResolve(partner2);

      const result: ConsumerDTO = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "partner-1-api-key" },
        { user: { entity: consumer } },
      );

      const filteredConsumer: Consumer = consumer;
      filteredConsumer.props.cryptoWallets = [
        {
          address: "wallet-1",
          partnerID: "1111111111",
          status: WalletStatus.APPROVED,
          isPrivate: true,
        },
        {
          address: "wallet-3",
          partnerID: "1111111111",
          status: WalletStatus.APPROVED,
          isPrivate: true,
        },
      ];
      expect(result).toStrictEqual(consumerMapper.toDTO(filteredConsumer));
    });

    it("shouldn't filter wallets belonging to the 'partner' if 'viewOtherWallets' is true", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [
          {
            address: "wallet-1",
            partnerID: "1111111111",
            status: WalletStatus.APPROVED,
            isPrivate: false,
          },
          {
            address: "wallet-2",
            partnerID: "2222222222",
            status: WalletStatus.APPROVED,
            isPrivate: false,
          },
          {
            address: "wallet-3",
            partnerID: "1111111111",
            status: WalletStatus.APPROVED,
            isPrivate: false,
          },
        ],
      });
      when(consumerService.getConsumer(consumer.props._id)).thenResolve(consumer);

      const partner1: Partner = Partner.createPartner({
        _id: "1111111111",
        apiKey: "partner-1-api-key",
        name: "partner1",
        config: {
          viewOtherWallets: true,
        } as any,
      });
      when(partnerService.getPartnerFromApiKey("partner-1-api-key")).thenResolve(partner1);

      const result: ConsumerDTO = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "partner-1-api-key" },
        { user: { entity: consumer } },
      );

      expect(result).toStrictEqual(consumerMapper.toDTO(consumer));
    });

    it("should works if there are no wallets belonging to the 'partner' in context", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [],
      });
      when(consumerService.getConsumer(consumer.props._id)).thenResolve(consumer);

      const partner1: Partner = Partner.createPartner({
        _id: "1111111111",
        apiKey: "partner-1-api-key",
        name: "partner1",
      });
      const partner2: Partner = Partner.createPartner({
        _id: "2222222222",
        apiKey: "partner-2-api-key",
        name: "partner2",
      });
      when(partnerService.getPartnerFromApiKey("partner-1-api-key")).thenResolve(partner1);
      when(partnerService.getPartnerFromApiKey("partner-2-api-key")).thenResolve(partner2);

      const result: ConsumerDTO = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "partner-1-api-key" },
        { user: { entity: consumer } },
      );

      expect(result).toStrictEqual(consumerMapper.toDTO(consumer));
    });

    it("should update consumer details", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      const requestData: UpdateConsumerRequestDTO = {
        firstName: "New Mock",
        phone: "123456789",
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
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      when(
        consumerService.addPaymentMethod(deepEqual(consumer), deepEqual(paymentMethodRequest), "partner-1"),
      ).thenResolve(
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
            },
          ],
        }),
      );

      const result = await consumerController.addPaymentMethod(paymentMethodRequest, {
        user: {
          entity: consumer,
          partnerId: "partner-1",
        } as AuthenticatedUser,
      });

      expect(result._id).toBe(consumer.props._id);
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0].name).toBe(paymentMethodRequest.name);
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
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      try {
        await consumerController.addPaymentMethod(paymentMethodRequest, {
          user: {
            entity: consumer,
            partnerId: "partner-1",
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
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      try {
        await consumerController.addPaymentMethod(paymentMethodRequest, {
          user: {
            entity: consumer,
            partnerId: "partner-1",
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
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      when(
        consumerService.addPaymentMethod(deepEqual(consumer), deepEqual(paymentMethodRequest), "partner-1"),
      ).thenResolve(
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
            },
          ],
        }),
      );

      const result = await consumerController.addPaymentMethod(paymentMethodRequest, {
        user: {
          entity: consumer,
          partnerId: "partner-1",
        } as AuthenticatedUser,
      });

      expect(result._id).toBe(consumer.props._id);
      expect(result.paymentMethods.length).toBe(1);
    });
  });

  describe("external state mapping tests", () => {
    it("should return UserState as APPROVED when all are Approved", async () => {
      const consumer = Consumer.createConsumer({
        _id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        partners: [
          {
            partnerID: "partner-1",
          },
        ],
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
        cryptoWallets: [
          {
            address: "wallet-1",
            partnerID: "fake-partner-1",
            status: WalletStatus.APPROVED,
            isPrivate: false,
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
          },
        ],
        verificationData: {
          kycVerificationStatus: KYCStatus.APPROVED,
          documentVerificationStatus: DocumentVerificationStatus.APPROVED,
          verificationProvider: VerificationProviders.SARDINE,
        },
      });

      when(consumerService.getConsumer(consumer.props._id)).thenResolve(consumer);
      when(partnerService.getPartnerFromApiKey("partner-1-api-key")).thenResolve(
        Partner.createPartner({
          name: "Test Partner",
          _id: "fake-partner-1",
        }),
      );
      const response = await consumerController.getConsumer(
        { [X_NOBA_API_KEY]: "partner-1-api-key" },
        { user: { entity: consumer } },
      );

      expect(response.status).toBe(UserState.APPROVED);
    });
  });
});
