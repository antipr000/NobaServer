import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { anyString, instance, when } from "ts-mockito";
import { CircleClient } from "../circle.client";
import { CircleService } from "../circle.service";
import { getMockCircleClientWithDefaults } from "../mocks/mock.circle.client";
import { getMockCircleServiceWithDefaults } from "../mocks/mock.circle.service";
import { ICircleRepo } from "../repos/CircleRepo";
import { getMockCircleRepoWithDefaults } from "../mocks/mock.circle.repo";
import { Result } from "../../../core/logic/Result";
import { Circle } from "../domain/Circle";
import { ServiceException } from "../../../core/exception/ServiceException";

describe("CircleService", () => {
  let circleService: CircleService;
  let circleClient: CircleClient;
  let circleRepo: ICircleRepo;

  jest.setTimeout(30000);

  beforeEach(async () => {
    circleClient = getMockCircleClientWithDefaults();
    circleRepo = getMockCircleRepoWithDefaults();

    const CircleRepoProvider = {
      provide: "CircleRepo",
      useFactory: () => instance(circleRepo),
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        {
          provide: CircleClient,
          useFactory: () => instance(circleClient),
        },
        CircleRepoProvider,
        CircleService,
      ],
    }).compile();

    circleService = app.get<CircleService>(CircleService);
  });

  describe("getOrCreateWallet", () => {
    it("should return a wallet id", async () => {
      when(circleRepo.getCircleWalletID("consumerID")).thenResolve(Result.ok("walletID"));

      const walletId = await circleService.getOrCreateWallet("consumerID");
      expect(walletId).toEqual("walletID");
    });

    it("should create a wallet id", async () => {
      when(circleRepo.getCircleWalletID("consumerID")).thenResolve(Result.fail("Wallet not found"));
      when(circleClient.createWallet(anyString())).thenResolve("walletID");
      when(circleRepo.addConsumerCircleWalletID("consumerID", "walletID")).thenResolve(
        Circle.createCircle({ consumerID: "consumerID", walletID: "walletID" }),
      );
      const walletId = await circleService.getOrCreateWallet("consumerID");
      expect(walletId).toEqual("walletID");
    });

    it("should throw an error when consumerID is empty", async () => {
      await expect(circleService.getOrCreateWallet("")).rejects.toThrow(ServiceException);
    });

    it("should throw an error when linking Circle wallet to consumer", async () => {
      when(circleRepo.getCircleWalletID("consumerID")).thenResolve(Result.fail("Wallet not found"));
      when(circleClient.createWallet(anyString())).thenResolve("walletID");
      when(circleRepo.addConsumerCircleWalletID("consumerID", "walletID")).thenThrow();
      await expect(circleService.getOrCreateWallet("consumerID")).rejects.toThrow(ServiceException);
    });
  });
});
