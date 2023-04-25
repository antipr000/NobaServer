import { PrismaClient } from "@prisma/client";
import {
  NotificationEventType,
  preferredNotificationMedium,
  NotificationEventHandler,
  emailTemplateExternalLinkMap,
  smsTemplateStringMap,
  pushEventTemplateStringMap,
} from "./data/event.data";

export async function seedEventsAndTemplates(prisma: PrismaClient) {
  const notificationEvents = Object.values(NotificationEventType);

  await Promise.all(
    notificationEvents.map(async eventType => {
      const handlers: NotificationEventHandler[] = preferredNotificationMedium[eventType];

      // Creating event record
      const event = await prisma.event.upsert({
        where: { name: eventType },
        update: {},
        create: {
          name: eventType,
          handlers: handlers,
        },
      });

      // Adding templates
      for (const handler of handlers) {
        if (handler === NotificationEventHandler.EMAIL) {
          const externalTemplateKeyMap = emailTemplateExternalLinkMap[eventType];
          for (const locale of Object.keys(externalTemplateKeyMap)) {
            // Check if template exists
            const template = await prisma.eventTemplate.findFirst({
              where: {
                eventID: event.id,
                locale,
                type: handler,
              },
            });

            if (!template) {
              // Create new template
              await prisma.eventTemplate.create({
                data: {
                  locale,
                  type: handler,
                  externalKey: externalTemplateKeyMap[locale as keyof typeof externalTemplateKeyMap],
                  event: {
                    connect: {
                      id: event.id,
                    },
                  },
                },
              });
            } else if (template.externalKey !== externalTemplateKeyMap[locale as keyof typeof externalTemplateKeyMap]) {
              // Update template
              await prisma.eventTemplate.update({
                where: {
                  id: template.id,
                },
                data: {
                  externalKey: externalTemplateKeyMap[locale as keyof typeof externalTemplateKeyMap],
                },
              });
            }
          }
        } else if (handler === NotificationEventHandler.SMS) {
          const smsTemplateMap = smsTemplateStringMap[eventType];
          for (const locale of Object.keys(smsTemplateMap)) {
            // Check if template exists
            const template = await prisma.eventTemplate.findFirst({
              where: {
                eventID: event.id,
                locale,
                type: handler,
              },
            });

            if (!template) {
              // Create new template
              await prisma.eventTemplate.create({
                data: {
                  locale,
                  type: handler,
                  templateBody: smsTemplateMap[locale as keyof typeof smsTemplateMap],
                  event: {
                    connect: {
                      id: event.id,
                    },
                  },
                },
              });
            } else if (template.templateBody !== smsTemplateMap[locale as keyof typeof smsTemplateMap]) {
              // Update template
              await prisma.eventTemplate.update({
                where: {
                  id: template.id,
                },
                data: {
                  templateBody: smsTemplateMap[locale as keyof typeof smsTemplateMap],
                },
              });
            }
          }
        } else if (handler === NotificationEventHandler.PUSH) {
          const pushTemplateMap = pushEventTemplateStringMap[eventType];
          for (const locale of Object.keys(pushTemplateMap)) {
            // Check if template exists
            const template = await prisma.eventTemplate.findFirst({
              where: {
                eventID: event.id,
                locale,
                type: handler,
              },
            });

            if (!template) {
              // Create new template
              await prisma.eventTemplate.create({
                data: {
                  locale,
                  type: handler,
                  templateBody: pushTemplateMap[locale as keyof typeof pushTemplateMap],
                  event: {
                    connect: {
                      id: event.id,
                    },
                  },
                },
              });
            } else if (template.templateBody !== pushTemplateMap[locale as keyof typeof pushTemplateMap]) {
              // Update template
              await prisma.eventTemplate.update({
                where: {
                  id: template.id,
                },
                data: {
                  templateBody: pushTemplateMap[locale as keyof typeof pushTemplateMap],
                },
              });
            }
          }
        }
      }

      const allTemplates = await prisma.eventTemplate.findMany({ where: { eventID: event.id } });

      // Delete templates that are not in the list of handlers
      await Promise.all(
        allTemplates.map(async template => {
          if (!handlers.includes(template.type as NotificationEventHandler)) {
            await prisma.eventTemplate.delete({ where: { id: template.id } });
          }
        }),
      );
    }),
  );
}
