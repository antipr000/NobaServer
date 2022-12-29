import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { instance, when } from "ts-mockito";
import { CircleClient } from "../circle.client";
import { CircleService } from "../circle.service";
import { getMockCircleClientWithDefaults } from "../mocks/mock.circle.client";
import { getMockCircleServiceWithDefaults } from "../mocks/mock.circle.service";

describe("CircleService", () => {
  let circleService: CircleService;
  let circleClient: CircleClient;

  jest.setTimeout(10000);

  beforeEach(async () => {
    circleClient = getMockCircleClientWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: CircleClient,
          useFactory: () => instance(circleClient),
        },
        CircleService,
      ],
    }).compile();

    circleService = app.get<CircleService>(CircleService);
  });

  describe("getOrCreateWallet", () => {
    it("should return wallet ID if wallet already exists", async () => {
      when(circleClient.createWallet("consumerID")).thenResolve("walletID");
      const walletID = await circleService.getOrCreateWallet("consumerID");
      expect(walletID).toEqual("walletID");
    });

    it("should create wallet if wallet does not exist", async () => {
      when(circleClient.createWallet("consumerID")).thenResolve("walletID");
      const walletID = await circleService.getOrCreateWallet("consumerID");
      expect(walletID).toEqual("walletID");
    });
  });
});
