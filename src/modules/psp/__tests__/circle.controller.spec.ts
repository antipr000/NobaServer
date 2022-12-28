import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "src/core/utils/AppConfigModule";
import { getTestWinstonModule } from "src/core/utils/WinstonModule";
import { instance } from "ts-mockito";
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

  // describe("circle controller tests", () => {
  //   it("should ")
});
