import { PrismaClient } from "@prisma/client";
import { reminderScheduleMap } from "./data/scheduled.reminder.data";

export async function seedScheduledReminders(prisma: PrismaClient) {
  const reminderEvents: string[] = Object.keys(reminderScheduleMap);

  await Promise.all(
    reminderEvents.map(async eventName => {
      const event = await prisma.event.findUnique({ where: { name: eventName } });

      if (!event) {
        console.log(`Event ${eventName} not found`);
        return;
      }

      const schedule = reminderScheduleMap[eventName];

      const query: string = schedule.query(event.id);

      try {
        await prisma.reminderSchedule.upsert({
          where: { eventID: event.id },
          update: {
            query,
            groupKey: schedule.groupKey,
          },
          create: {
            query,
            groupKey: schedule.groupKey,
            event: {
              connect: {
                id: event.id,
              },
            },
          },
        });
      } catch (e) {
        console.log(
          `Error seeding scheduledReminder for event with id: ${event.id}}, query: ${query}, groupKey: ${schedule.groupKey}`,
        );
      }
    }),
  );
}
