import { uuid } from "uuidv4";
import { PrismaService } from "../../../infraproviders/PrismaService";
import { Event, ReminderHistory, ReminderSchedule } from "@prisma/client";

export const createAndSaveEvent = async (prismaService: PrismaService): Promise<Event> => {
  const event = await prismaService.event.create({
    data: {
      name: uuid(),
      handlers: [],
    },
  });

  return event;
};

export const createAndSaveReminderSchedule = (
  event: Event,
  prismaService: PrismaService,
  groupKey?: string,
): Promise<ReminderSchedule> => {
  const reminderSchedule = {
    query: "select * from consumers",
    groupKey: groupKey ?? "group-1234", // "group-1234" is the default groupKey
    eventID: event.id,
  };

  return prismaService.reminderSchedule.create({
    data: reminderSchedule,
  });
};

export const createAndSaveReminderHistory = async (
  reminderScheduleID: string,
  consumerID: string,
  lastSentTimestamp: Date,
  prismaService: PrismaService,
): Promise<ReminderHistory> => {
  return prismaService.reminderHistory.create({
    data: {
      consumer: {
        connect: {
          id: consumerID,
        },
      },
      reminderSchedule: {
        connect: {
          id: reminderScheduleID,
        },
      },
      lastSentTimestamp: lastSentTimestamp,
    },
  });
};
