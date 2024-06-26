import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../../core/utils/WinstonModule";
import { instance, when } from "ts-mockito";
import { CircleService } from "../circle.service";
import { CircleController } from "../circle.controller";
import { getMockCircleServiceWithDefaults } from "../mocks/mock.circle.service";
import { Consumer } from "../../../consumer/domain/Consumer";

describe("CircleController", () => {
  let circleService: CircleService;
  let circleController: CircleController;

  beforeAll(async () => {
    circleService = getMockCircleServiceWithDefaults();
    const app: TestingModule = await Test.createTestingModule({
      imports: [await TestConfigModule.registerAsync({}), getTestWinstonModule()],
      providers: [
        {
          provide: CircleService,
          useFactory: () => instance(circleService),
        },
      ],
      controllers: [CircleController],
    }).compile();
    circleController = app.get<CircleController>(CircleController);
  });

  describe("wallet", () => {
    it("should return a wallet when adding", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      when(circleService.getOrCreateWallet(consumer.props.id)).thenResolve("walletID");
      const result = await circleController.addConsumerWallet(consumer);
      expect(result.walletID).toEqual("walletID");
    });
  });

  describe("wallet balance", () => {
    it("should return a wallet balance", async () => {
      const consumer = Consumer.createConsumer({
        id: "mock-consumer-1",
        firstName: "Mock",
        lastName: "Consumer",
        dateOfBirth: "1998-01-01",
        email: "mock@noba.com",
      });

      when(circleService.getOrCreateWallet(consumer.props.id)).thenResolve("walletID");
      when(circleService.getBalance("walletID", false)).thenResolve({ balance: 100, currency: "USD" });
      const result = await circleController.getConsumerWalletBalance(consumer, {});
      expect(result.balance).toEqual(100);
    });
  });
});
