import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { deepEqual, instance, verify } from "ts-mockito";
import { NotificationWorkflowService } from "../notification.workflow.service";
import { NotificationWorkflowController } from "../notification.workflow.controller";
import { getMockNotificationWorkflowServiceWithDefaults } from "../mocks/mock.notification.workflow.service";
import { NotificationWorkflowTypes } from "../domain/NotificationTypes";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";

describe("NotificationWorkflowController Tests", () => {
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
      await notificationWorkflowController.sendNotification(NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT, {
        transactionID: "test",
      });

      verify(
        notificationWorflowService.sendNotification(
          NotificationWorkflowTypes.DEPOSIT_COMPLETED_EVENT,
          deepEqual({
            transactionID: "test",
          }),
        ),
      ).once();
    });

    it("should send update payroll status notification", async () => {
      await notificationWorkflowController.sendNotification(NotificationWorkflowTypes.UPDATE_PAYROLL_STATUS_EVENT, {
        payrollID: "test",
        payrollStatus: PayrollStatus.COMPLETED,
      });

      verify(
        notificationWorflowService.sendNotification(
          NotificationWorkflowTypes.UPDATE_PAYROLL_STATUS_EVENT,
          deepEqual({
            payrollID: "test",
            payrollStatus: PayrollStatus.COMPLETED,
          }),
        ),
      ).once();
    });
  });
});
