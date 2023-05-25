import { TestingModule, Test } from "@nestjs/testing";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { anything, deepEqual, instance, verify, when } from "ts-mockito";
import { NotificationWorkflowService } from "../notification.workflow.service";
import { NotificationWorkflowController } from "../notification.workflow.controller";
import { getMockNotificationWorkflowServiceWithDefaults } from "../mocks/mock.notification.workflow.service";
import { NotificationWorkflowTypes } from "../domain/NotificationTypes";
import { PayrollStatus } from "../../../modules/employer/domain/Payroll";
import { CreateReminderScheduleDTO } from "../dto/notification.workflow.controller.dto";

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

  describe("POST /reminder", () => {
    it("should create a reminder", async () => {
      const requestBody: CreateReminderScheduleDTO = {
        eventID: "test",
        query: "test",
        groupKey: "group-key",
      };

      const reminder = {
        id: "fake-id-1",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        eventID: "test",
        query: "test",
        groupKey: "group-key",
      };

      when(notificationWorflowService.createReminderSchedule(anything())).thenResolve(reminder);

      const response = await notificationWorkflowController.createReminderSchedule(requestBody);
      expect(response).toStrictEqual(reminder);
      verify(notificationWorflowService.createReminderSchedule(deepEqual(requestBody))).once();
    });
  });

  describe("PATCH /reminder/:reminderID/history", () => {
    it("should update reminder history", async () => {
      const requestBody = {
        consumerID: "fake-consumer",
        lastSentTimestamp: new Date(),
      };

      const reminderHistory = {
        id: "fake-id-1",
        createdTimestamp: new Date(),
        updatedTimestamp: new Date(),
        reminderScheduleID: "fake-schedule",
        consumerID: "fake-consumer",
        eventID: "fake-event",
        lastSentTimestamp: requestBody.lastSentTimestamp,
      };

      when(notificationWorflowService.createOrUpdateReminderScheduleHistory(anything(), anything())).thenResolve(
        reminderHistory,
      );

      await notificationWorkflowController.createReminderHistory("fake-schedule", requestBody);
      verify(
        notificationWorflowService.createOrUpdateReminderScheduleHistory("fake-schedule", deepEqual(requestBody)),
      ).once();
    });
  });

  describe("GET /reminder/:groupKey", () => {
    it("should get reminders by group key", async () => {
      const reminders = [
        {
          id: "fake-id-1",
          createdTimestamp: new Date(),
          updatedTimestamp: new Date(),
          eventID: "test",
          query: "test",
          groupKey: "group-key",
        },
      ];

      when(notificationWorflowService.getAllReminderSchedulesForGroup(anything())).thenResolve(reminders);

      const response = await notificationWorkflowController.getReminderSchedules("group-key");
      expect(response).toStrictEqual(reminders);
      verify(notificationWorflowService.getAllReminderSchedulesForGroup("group-key")).once();
    });
  });

  describe("GET /reminder/:reminderID/consumers", () => {
    it("should get consumers for reminder", async () => {
      const consumers = ["fake-id1", "fake-id2"];

      when(notificationWorflowService.getAllConsumerIDsForReminder(anything())).thenResolve(consumers);

      const response = await notificationWorkflowController.getReminderConsumers("fake-schedule");
      expect(response).toStrictEqual(consumers);
      verify(notificationWorflowService.getAllConsumerIDsForReminder("fake-schedule")).once();
    });
  });

  describe("POST /event/:eventID", () => {
    it("should dispatch event by id", async () => {
      const requestBody = {
        consumerID: "fake-consumer",
      };

      when(notificationWorflowService.sendEvent(anything(), anything())).thenResolve();
      await notificationWorkflowController.sendEvent("fake-event", requestBody);
      verify(notificationWorflowService.sendEvent("fake-event", deepEqual(requestBody))).once();
    });
  });
});
