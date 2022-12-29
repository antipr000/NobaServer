import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { instance, when } from "ts-mockito";
import { CircleClient } from "../circle.client";
import { CircleService } from "../circle.service";
import { getMockCircleClientWithDefaults } from "../mocks/mock.circle.client";
import { getMockCircleServiceWithDefaults } from "../mocks/mock.circle.service";
import { ICircleRepo } from "../repos/CircleRepo";
import { getMockCircleRepoWithDefaults } from "../mocks/mock.circle.repo";

describe("CircleService", () => {
  let circleService: CircleService;
  let circleClient: CircleClient;
  let circleRepo: ICircleRepo;

  jest.setTimeout(10000);

  beforeEach(async () => {
    circleClient = getMockCircleClientWithDefaults();
    circleRepo = getMockCircleRepoWithDefaults();
    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: CircleClient,
          useFactory: () => instance(circleClient),
        },
        {
          provide: "CircleRepo",
          useFactory: () => instance(circleRepo),
        },
        CircleService,
      ],
    }).compile();

    circleService = app.get<CircleService>(CircleService);
  });
});
