import { Test, TestingModule } from "@nestjs/testing";
import { deepEqual, instance, when } from "ts-mockito";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { ConsumerController } from "../consumer.controller";
import { ConsumerService } from "../consumer.service";
import { Consumer } from "../domain/Consumer";
import { PaymentProviders } from "../domain/PaymentProviderDetails";
import { AddPaymentMethodDTO } from "../dto/AddPaymentMethodDTO";
import { ConsumerDTO } from "../dto/ConsumerDTO";
import { UpdateConsumerRequestDTO } from "../dto/UpdateConsumerRequestDTO";
import { ConsumerMapper } from "../mappers/ConsumerMapper";
import { getMockConsumerServiceWithDefaults } from "../mocks/mock.consumer.service";

describe("ConsumerController", () => {
  let consumerController: ConsumerController;
  let consumerService: ConsumerService;

  const consumerMapper = new ConsumerMapper();

  jest.setTimeout(30000);

  beforeEach(async () => {
    consumerService = getMockConsumerServiceWithDefaults();
    const UserServiceProvider = {
      provide: ConsumerService,
      useFactory: () => instance(consumerService),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [ConsumerController],
      providers: [UserServiceProvider],
    }).compile();

    consumerController = app.get<ConsumerController>(ConsumerController);
  });

  describe("consumer controller tests", () => {
    it("should get consuner data", async () => {
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

      when(consumerService.getConsumer(consumer.props._id)).thenResolve(consumer);

      const result: ConsumerDTO = await consumerController.getConsumer({
        user: { entity: consumer },
      });

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

    it("should add a payment method", async () => {
      const paymentMethodRequest: AddPaymentMethodDTO = {
        cardName: "Fake Card",
        cardNumber: "12345678901234",
        expiryMonth: 2,
        expiryYear: 2023,
        cvv: "765",
      };

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

      when(consumerService.addPaymentMethod(deepEqual(consumer), deepEqual(paymentMethodRequest))).thenResolve(
        Consumer.createConsumer({
          ...consumer.props,
          paymentMethods: [
            {
              paymentProviderID: PaymentProviders.CHECKOUT,
              paymentToken: "faketoken1234",
              cardName: paymentMethodRequest.cardName,
              cardType: "VISA",
              first6Digits: "123456",
              last4Digits: "1234",
              imageUri: "testimage",
            },
          ],
        }),
      );

      const result = await consumerController.addPaymentMethod(paymentMethodRequest, {
        user: {
          entity: consumer,
        },
      });

      expect(result._id).toBe(consumer.props._id);
      expect(result.paymentMethods.length).toBe(1);
      expect(result.paymentMethods[0].cardName).toBe(paymentMethodRequest.cardName);
    });
  });
});
