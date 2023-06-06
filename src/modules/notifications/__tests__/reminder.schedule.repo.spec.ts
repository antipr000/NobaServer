import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { ReminderScheduleRepo } from "../repos/reminder.schedule.repo";
import { SQLReminderScheduleRepo } from "../repos/sql.reminder.schedule.repo";
import { createAndSaveEvent, createAndSaveReminderSchedule } from "../test_utils/notification.test.utils";
import { RepoErrorCode } from "../../../core/exception/repo.exception";
import { uuid } from "uuidv4";
import { AlertService } from "../../../modules/common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../modules/common/mocks/mock.alert.service";
import { instance } from "ts-mockito";

describe("ReminderScheduleRepoTests", () => {
  jest.setTimeout(20000);

  let reminderScheduleRepo: ReminderScheduleRepo;
  let app: TestingModule;
  let prismaService: PrismaService;
  let mockAlertService: AlertService;

  beforeAll(async () => {
    const appConfigurations = {
      [SERVER_LOG_FILE_PATH]: `/tmp/test-${Math.floor(Math.random() * 1000000)}.log`,
    };
    // ***************** ENVIRONMENT VARIABLES CONFIGURATION *****************
    mockAlertService = getMockAlertServiceWithDefaults();
    app = await Test.createTestingModule({
      imports: [TestConfigModule.registerAsync(appConfigurations), getTestWinstonModule()],
      providers: [
        PrismaService,
        SQLReminderScheduleRepo,
        {
          provide: AlertService,
          useFactory: () => instance(mockAlertService),
        },
      ],
    }).compile();

    reminderScheduleRepo = app.get<ReminderScheduleRepo>(SQLReminderScheduleRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.reminderSchedule.deleteMany();
    app.close();
  });

  describe("createReminderSchedule", () => {
    it("should create a reminder schedule", async () => {
      const event = await createAndSaveEvent(prismaService);

      const reminderSchedule = await reminderScheduleRepo.createReminderSchedule({
        query: "select * from consumers",
        groupKey: "group-1234",
        eventID: event.id,
      });

      expect(reminderSchedule).toBeDefined();
      expect(reminderSchedule.id).toBeDefined();
      expect(reminderSchedule.query).toEqual("select * from consumers");
      expect(reminderSchedule.groupKey).toEqual("group-1234");
      expect(reminderSchedule.eventID).toEqual(event.id);
    });

    it("should throw RepoException if event does not exist", async () => {
      await expect(
        reminderScheduleRepo.createReminderSchedule({
          query: "select * from consumers",
          groupKey: "group-1234",
          eventID: "event-does-not-exist",
        }),
      ).rejects.toThrowRepoException(RepoErrorCode.DATABASE_INTERNAL_ERROR);
    });

    it("should throw error when create request payload is invalid", async () => {
      await expect(
        reminderScheduleRepo.createReminderSchedule({
          query: "",
          groupKey: "",
          eventID: "",
        }),
      ).rejects.toThrowError();
    });
  });

  describe("updateReminderSchedule", () => {
    it("should update a reminder schedule", async () => {
      const event = await createAndSaveEvent(prismaService);
      const reminderSchedule = await createAndSaveReminderSchedule(event, prismaService);

      const updatedReminderSchedule = await reminderScheduleRepo.updateReminderSchedule(reminderSchedule.id, {
        query: "select * from transactions",
        groupKey: "group-2",
      });

      expect(updatedReminderSchedule).toBeDefined();
      expect(updatedReminderSchedule.id).toEqual(reminderSchedule.id);
      expect(updatedReminderSchedule.query).toEqual("select * from transactions");
      expect(updatedReminderSchedule.groupKey).toEqual("group-2");
      expect(updatedReminderSchedule.eventID).toEqual(event.id);
    });

    it("should throw RepoException if reminder schedule does not exist", async () => {
      await expect(
        reminderScheduleRepo.updateReminderSchedule("reminder-schedule-does-not-exist", {
          query: "select * from transactions",
          groupKey: "group-2",
        }),
      ).rejects.toThrowRepoException(RepoErrorCode.DATABASE_INTERNAL_ERROR);
    });

    it("should throw error when update request payload is invalid", async () => {
      await expect(
        reminderScheduleRepo.updateReminderSchedule("reminder-schedule-does-not-exist", {
          groupKey: 2 as any,
        }),
      ).rejects.toThrowError();
    });
  });

  describe("getReminderScheduleByID", () => {
    it("should get reminder schedule by id", async () => {
      const event = await createAndSaveEvent(prismaService);
      const reminderSchedule = await createAndSaveReminderSchedule(event, prismaService);

      const fetchedReminderSchedule = await reminderScheduleRepo.getReminderScheduleByID(reminderSchedule.id);

      expect(fetchedReminderSchedule).toBeDefined();
      expect(fetchedReminderSchedule.id).toEqual(reminderSchedule.id);
      expect(fetchedReminderSchedule.query).toEqual(reminderSchedule.query);
      expect(fetchedReminderSchedule.groupKey).toEqual(reminderSchedule.groupKey);
      expect(fetchedReminderSchedule.eventID).toEqual(reminderSchedule.eventID);
    });

    it("throws RepoException if reminder schedule does not exist", async () => {
      await expect(
        reminderScheduleRepo.getReminderScheduleByID("reminder-schedule-does-not-exist"),
      ).rejects.toThrowRepoException(RepoErrorCode.NOT_FOUND);
    });
  });

  describe("getReminderScheduleByEventID", () => {
    it("should get reminder schedule by event id", async () => {
      const event = await createAndSaveEvent(prismaService);
      const reminderSchedule = await createAndSaveReminderSchedule(event, prismaService);

      const fetchedReminderSchedule = await reminderScheduleRepo.getReminderScheduleByEventID(event.id);

      expect(fetchedReminderSchedule).toBeDefined();
      expect(fetchedReminderSchedule.id).toEqual(reminderSchedule.id);
      expect(fetchedReminderSchedule.query).toEqual(reminderSchedule.query);
      expect(fetchedReminderSchedule.groupKey).toEqual(reminderSchedule.groupKey);
      expect(fetchedReminderSchedule.eventID).toEqual(reminderSchedule.eventID);
    });

    it("throws RepoException if reminder schedule does not exist", async () => {
      await expect(
        reminderScheduleRepo.getReminderScheduleByEventID("reminder-schedule-does-not-exist"),
      ).rejects.toThrowRepoException(RepoErrorCode.NOT_FOUND);
    });
  });

  describe("getAllReminderSchedulesForGroup", () => {
    it("should get reminder schedule for group", async () => {
      const group = uuid();
      const event1 = await createAndSaveEvent(prismaService);
      await createAndSaveReminderSchedule(event1, prismaService, group);

      const event2 = await createAndSaveEvent(prismaService);
      await createAndSaveReminderSchedule(event2, prismaService, group);

      const event3 = await createAndSaveEvent(prismaService);
      await createAndSaveReminderSchedule(event3, prismaService, "group-different");

      const fetchedReminderSchedule = await reminderScheduleRepo.getAllReminderSchedulesForGroup(group);

      expect(fetchedReminderSchedule.length).toBe(2);
    });

    it("should return empty list if no schedule for group exists", async () => {
      const fetchedReminderSchedule = await reminderScheduleRepo.getAllReminderSchedulesForGroup(
        "group-does-not-exist",
      );

      expect(fetchedReminderSchedule.length).toBe(0);
    });
  });

  describe("deleteReminderSchedule", () => {
    it("should delete reminder schedule", async () => {
      const event = await createAndSaveEvent(prismaService);
      const reminderSchedule = await createAndSaveReminderSchedule(event, prismaService);

      await reminderScheduleRepo.deleteReminderSchedule(reminderSchedule.id);

      await expect(reminderScheduleRepo.getReminderScheduleByID(reminderSchedule.id)).rejects.toThrowRepoException(
        RepoErrorCode.NOT_FOUND,
      );
    });

    it("should throw RepoException if reminder schedule does not exist", async () => {
      await expect(
        reminderScheduleRepo.deleteReminderSchedule("reminder-schedule-does-not-exist"),
      ).rejects.toThrowRepoException(RepoErrorCode.DATABASE_INTERNAL_ERROR);
    });
  });
});
