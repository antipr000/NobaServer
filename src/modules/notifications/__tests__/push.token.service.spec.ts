import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { getMockPushTokenRepoWithDefaults } from "../mocks/mock.pushtoken.repo";
import { IPushTokenRepo } from "../repos/pushtoken.repo";
import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { instance, when } from "ts-mockito";
import { PushTokenService } from "../push.token.service";
import { ServiceException } from "../../../core/exception/service.exception";

describe("PushTokenService", () => {
  let pushTokenRepo: IPushTokenRepo;
  let pushTokenService: PushTokenService;
  jest.setTimeout(30000);

  beforeEach(async () => {
    pushTokenRepo = getMockPushTokenRepoWithDefaults();

    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        PushTokenService,
        {
          provide: "PushTokenRepo",
          useFactory: () => instance(pushTokenRepo),
        },
      ],
    }).compile();

    pushTokenService = app.get<PushTokenService>(PushTokenService);
  });

  describe("subscribeToPushNotifications", () => {
    it("should subscribe to push notifications", async () => {
      when(pushTokenRepo.getPushToken("test-consumer-id", "test-push-token")).thenResolve(undefined);
      when(pushTokenRepo.addPushToken("test-consumer-id", "test-push-token")).thenResolve("push-token-id");
      expect(pushTokenService.subscribeToPushNotifications("test-consumer-id", "test-push-token")).resolves.toBe(
        "push-token-id",
      );
    });

    it("should not subscribe to push notifications if already subscribed", async () => {
      when(pushTokenRepo.getPushToken("test-consumer-id", "test-push-token")).thenResolve("push-token-id");
      expect(pushTokenService.subscribeToPushNotifications("test-consumer-id", "test-push-token")).resolves.toBe(
        "push-token-id",
      );
    });
  });

  describe("unsubscribeFromPushNotifications", () => {
    it("should unsubscribe to push notifications", async () => {
      when(pushTokenRepo.deletePushToken("test-consumer-id", "test-push-token")).thenResolve("deleted-push-token-id");
      expect(pushTokenService.unsubscribeFromPushNotifications("test-consumer-id", "test-push-token")).resolves.toBe(
        "deleted-push-token-id",
      );
    });

    it("should not unsubscribe to push notifications if not subscribed", async () => {
      when(pushTokenRepo.deletePushToken("test-consumer-id", "test-push-token")).thenResolve(undefined);
      expect(pushTokenService.unsubscribeFromPushNotifications("test-consumer-id", "test-push-token")).rejects.toThrow(
        ServiceException,
      );
    });
  });
});
