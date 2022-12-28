import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anything, instance, when, anyString } from "ts-mockito";
import { CircleController } from "../circle.controller";
import { CircleService } from "../circle.service";
import { getMockCircleServiceWithDefaults } from "../mocks/mock.circle.service";

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
    it("should return a wallet", async () => {
      when(circleService.getOrCreateWallet(anyString())).thenResolve("wallet");
      const result = await circleController.addConsumerWallet({}, {});
      expect(result).toEqual("wallet");
    });
  });
});
