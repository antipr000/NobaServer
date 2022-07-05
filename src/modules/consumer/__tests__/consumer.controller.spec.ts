import { Test, TestingModule } from "@nestjs/testing";
import { instance, when } from "ts-mockito";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { getMockConsumerServiceWithDefaults } from "../mocks/mock.consumer.service";
import { ConsumerController } from "../consumer.controller";
import { ConsumerService } from "../consumer.service";
import { Consumer } from "../domain/Consumer";
import { ConsumerDTO } from "../dto/ConsumerDTO";
import { ConsumerMapper } from "../mappers/ConsumerMapper";

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
        user: consumer,
      });

      expect(result).toStrictEqual(consumerMapper.toDTO(consumer));
    });
  });
});
