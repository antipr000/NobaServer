import { Test, TestingModule } from "@nestjs/testing";
import { TestConfigModule } from "../../../core/utils/AppConfigModule";
import { SERVER_LOG_FILE_PATH } from "../../../config/ConfigurationUtils";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { getTestWinstonModule } from "../../../core/utils/WinstonModule";
import { ReminderHistoryRepo } from "../repos/reminder.history.repo";
import { SQLReminderHistoryRepo } from "../repos/sql.reminder.history.repo";
import { createTestConsumer } from "../../../modules/consumer/test_utils/test.utils";
import {
  createAndSaveEvent,
  createAndSaveReminderHistory,
  createAndSaveReminderSchedule,
} from "../test_utils/notification.test.utils";
import { RepoErrorCode } from "../../../core/exception/repo.exception";
import { AlertService } from "../../../modules/common/alerts/alert.service";
import { getMockAlertServiceWithDefaults } from "../../../modules/common/mocks/mock.alert.service";
import { instance } from "ts-mockito";

describe("ReminderHistoryRepoTests", () => {
  jest.setTimeout(20000);

  let reminderHistoryRepo: ReminderHistoryRepo;
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
        SQLReminderHistoryRepo,
        {
          provide: AlertService,
          useFactory: () => instance(mockAlertService),
        },
      ],
    }).compile();

    reminderHistoryRepo = app.get<ReminderHistoryRepo>(SQLReminderHistoryRepo);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prismaService.reminderHistory.deleteMany();
    app.close();
  });

  describe("createReminderHistory", () => {
    it("should create reminder history", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const event = await createAndSaveEvent(prismaService);
      const reminderSchedule = await createAndSaveReminderSchedule(event, prismaService);

      const reminderHistory = await reminderHistoryRepo.createReminderHistory({
        consumerID,
        reminderScheduleID: reminderSchedule.id,
        eventID: event.id,
        lastSentTimestamp: new Date(),
      });

      expect(reminderHistory).toBeDefined();
      expect(reminderHistory.id).toBeDefined();
      expect(reminderHistory.consumerID).toEqual(consumerID);
      expect(reminderHistory.reminderScheduleID).toEqual(reminderSchedule.id);
      expect(reminderHistory.lastSentTimestamp).toBeDefined();
      expect(reminderHistory.eventID).toEqual(event.id);
    });

    it("should throw RepoException if consumer does not exist", async () => {
      const event = await createAndSaveEvent(prismaService);
      const reminderSchedule = await createAndSaveReminderSchedule(event, prismaService);

      await expect(
        reminderHistoryRepo.createReminderHistory({
          consumerID: "fake-id",
          reminderScheduleID: reminderSchedule.id,
          eventID: event.id,
          lastSentTimestamp: new Date(),
        }),
      ).rejects.toThrowRepoException(RepoErrorCode.DATABASE_INTERNAL_ERROR);
    });

    it("should throw RepoException if reminder schedule does not exist", async () => {
      const consumerID = await createTestConsumer(prismaService);

      await expect(
        reminderHistoryRepo.createReminderHistory({
          consumerID,
          reminderScheduleID: "fake-id",
          eventID: "fake-id",
          lastSentTimestamp: new Date(),
        }),
      ).rejects.toThrowRepoException(RepoErrorCode.DATABASE_INTERNAL_ERROR);
    });

    it("should throw RepoException if reminder history already exists", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const event = await createAndSaveEvent(prismaService);
      const reminderSchedule = await createAndSaveReminderSchedule(event, prismaService);

      await reminderHistoryRepo.createReminderHistory({
        consumerID,
        reminderScheduleID: reminderSchedule.id,
        eventID: event.id,
        lastSentTimestamp: new Date(),
      });

      await expect(
        reminderHistoryRepo.createReminderHistory({
          consumerID,
          reminderScheduleID: reminderSchedule.id,
          eventID: event.id,
          lastSentTimestamp: new Date(),
        }),
      ).rejects.toThrowRepoException(RepoErrorCode.DATABASE_INTERNAL_ERROR);
    });

    it("should throw error if create input is invalid", async () => {
      await expect(
        reminderHistoryRepo.createReminderHistory({
          consumerID: "fake-id",
          reminderScheduleID: "fake-id",
          eventID: "fake-id",
          lastSentTimestamp: 1234 as any,
        }),
      ).rejects.toThrowError();
    });
  });

  describe("updateReminderHistory", () => {
    it("should update reminder history", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const event = await createAndSaveEvent(prismaService);
      const reminderSchedule = await createAndSaveReminderSchedule(event, prismaService);
      const reminderHistory = await createAndSaveReminderHistory(
        reminderSchedule.id,
        consumerID,
        event.id,
        new Date(),
        prismaService,
      );

      const updatedReminderHistory = await reminderHistoryRepo.updateReminderHistory(reminderHistory.id, {
        lastSentTimestamp: new Date("2020-01-01"),
      });

      expect(updatedReminderHistory).toBeDefined();
      expect(updatedReminderHistory.id).toEqual(reminderHistory.id);
      expect(updatedReminderHistory.consumerID).toEqual(consumerID);
      expect(updatedReminderHistory.reminderScheduleID).toEqual(reminderSchedule.id);
      expect(updatedReminderHistory.lastSentTimestamp.valueOf()).toBe(new Date("2020-01-01").valueOf());
    });

    it("should throw RepoException if reminder history does not exist", async () => {
      await expect(
        reminderHistoryRepo.updateReminderHistory("fake-id", {
          lastSentTimestamp: new Date("2020-01-01"),
        }),
      ).rejects.toThrowRepoException(RepoErrorCode.DATABASE_INTERNAL_ERROR);
    });
  });

  describe("getReminderHistoryByID", () => {
    it("should get reminder history by id", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const event = await createAndSaveEvent(prismaService);
      const reminderSchedule = await createAndSaveReminderSchedule(event, prismaService);
      const reminderHistory = await createAndSaveReminderHistory(
        reminderSchedule.id,
        consumerID,
        event.id,
        new Date(),
        prismaService,
      );

      const fetchedReminderHistory = await reminderHistoryRepo.getReminderHistoryByID(reminderHistory.id);

      expect(fetchedReminderHistory).toBeDefined();
      expect(fetchedReminderHistory.id).toEqual(reminderHistory.id);
      expect(fetchedReminderHistory.consumerID).toEqual(consumerID);
      expect(fetchedReminderHistory.reminderScheduleID).toEqual(reminderSchedule.id);
      expect(fetchedReminderHistory.lastSentTimestamp.valueOf()).toBe(reminderHistory.lastSentTimestamp.valueOf());
    });

    it("should return null if reminder history does not exist", async () => {
      const fetchedReminderHistory = await reminderHistoryRepo.getReminderHistoryByID("fake-id");
      expect(fetchedReminderHistory).toBeNull();
    });
  });

  describe("getReminderHistoryByReminderScheduleIDAndConsumerID", () => {
    it("should get reminder history by reminder schedule id and consumer id", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const event = await createAndSaveEvent(prismaService);
      const reminderSchedule = await createAndSaveReminderSchedule(event, prismaService);
      const reminderHistory = await createAndSaveReminderHistory(
        reminderSchedule.id,
        consumerID,
        event.id,
        new Date(),
        prismaService,
      );

      const fetchedReminderHistory = await reminderHistoryRepo.getReminderHistoryByReminderScheduleIDAndConsumerID(
        reminderSchedule.id,
        consumerID,
      );

      expect(fetchedReminderHistory).toBeDefined();
      expect(fetchedReminderHistory.id).toEqual(reminderHistory.id);
      expect(fetchedReminderHistory.consumerID).toEqual(consumerID);
      expect(fetchedReminderHistory.reminderScheduleID).toEqual(reminderSchedule.id);
      expect(fetchedReminderHistory.lastSentTimestamp.valueOf()).toBe(reminderHistory.lastSentTimestamp.valueOf());
    });

    it("should return null if reminder history does not exist", async () => {
      const fetchedReminderHistory = await reminderHistoryRepo.getReminderHistoryByReminderScheduleIDAndConsumerID(
        "fake-id",
        "fake-id",
      );

      expect(fetchedReminderHistory).toBeNull();
    });
  });

  describe("getLatestReminderHistoryForConsumer", () => {
    it("should get latest reminder history for consumer", async () => {
      const consumerID = await createTestConsumer(prismaService);
      const event1 = await createAndSaveEvent(prismaService);
      const reminderSchedule1 = await createAndSaveReminderSchedule(event1, prismaService);

      const event2 = await createAndSaveEvent(prismaService);
      const reminderSchedule2 = await createAndSaveReminderSchedule(event2, prismaService);

      await createAndSaveReminderHistory(
        reminderSchedule1.id,
        consumerID,
        event1.id,
        new Date("2020-01-01"),
        prismaService,
      );

      const reminderHistory2 = await createAndSaveReminderHistory(
        reminderSchedule2.id,
        consumerID,
        event2.id,
        new Date("2020-01-02"),
        prismaService,
      );

      const fetchedReminderHistory = await reminderHistoryRepo.getLatestReminderHistoryForConsumer(consumerID);

      expect(fetchedReminderHistory).toBeDefined();
      expect(fetchedReminderHistory.id).toEqual(reminderHistory2.id);
      expect(fetchedReminderHistory.consumerID).toEqual(consumerID);
      expect(fetchedReminderHistory.reminderScheduleID).toEqual(reminderSchedule2.id);
    });

    it("should return null if reminder history does not exist", async () => {
      const fetchedReminderHistory = await reminderHistoryRepo.getLatestReminderHistoryForConsumer("fake-id");

      expect(fetchedReminderHistory).toBeNull();
    });
  });
});
