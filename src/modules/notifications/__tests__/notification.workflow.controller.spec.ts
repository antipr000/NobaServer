import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { instance, verify } from "ts-mockito";
import { NotificationWorkflowService } from "../notification.workflow.service";
import { NotificationWorkflowController } from "../notification.workflow.controller";
import { getMockNotificationWorkflowServiceWithDefaults } from "../mocks/mock.notification.workflow.service";
import { NotificationWorkflowTypes } from "../domain/NotificationTypes";

describe("NotificationService", () => {
  let notificationWorkflowController: NotificationWorkflowController;
  let notificationWorflowService: NotificationWorkflowService;

  jest.setTimeout(30000);

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };

    notificationWorflowService = getMockNotificationWorkflowServiceWithDefaults();

    const app: TestingModule = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync({}), getTestWinstonModule()],
      controllers: [],
      providers: [
        NotificationWorkflowController,
        {
          provide: NotificationWorkflowService,
          useFactory: () => instance(notificationWorflowService),
        },
      ],
    }).compile();

    notificationWorkflowController = app.get<NotificationWorkflowController>(NotificationWorkflowController);
  });

  describe("sendNotification", () => {
    it("should send notification", async () => {
      await notificationWorkflowController.sendNotification(NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT, "test");

      verify(
        notificationWorflowService.sendNotification(NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT, "test"),
      ).once();
    });
  });
});
